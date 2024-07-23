import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostDocument } from '../domains/domain-post';
import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { LikeStatus } from '../../../common/types';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NewestLikes, PostWithLikesInfo } from '../api/types/views';
import { CreatePostWithIdAndWithNameBlog } from '../api/types/dto';
import { BlogSqlRepository } from '../../blogs/repositories/blog-sql-repository';
import { LikeStatusForPostWithId } from '../../like-status-for-post/types/dto';

@Injectable()
/*@Injectable()-декоратор что данный клас
 инжектируемый--тобишь в него добавляются
 зависимости
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ  В ФАЙЛ app.module
 * providers: [AppService,UsersService]
 провайдер-это в том числе компонент котоый
 возможно внедрить как зависимость*/
export class PostQuerySqlRepository {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectDataSource() protected dataSource: DataSource,
    protected blogSqlRepository: BlogSqlRepository,
  ) {}

  async getPosts(
    queryParamsPostForBlog: QueryParamsInputModel,
    userId: string | null,
  ) {
    const { sortBy, sortDirection, pageNumber, pageSize } =
      queryParamsPostForBlog;

    /*   НАДО УКАЗЫВАТЬ КОЛИЧЕСТВО ПРОПУЩЕНЫХ
ЗАПИСЕЙ - чтобы получать следующие за ними

ЗНАЧЕНИЯ ПО УМОЛЧАНИЯ В ФАЙЛЕ
query-params-input-model.ts

pageNumber по умолчанию 1, тобишь
мне надо первую страницу на фронтенд отдать
, и это будут первые 10 записей из таблицы

pageSize - размер  одной страницы, ПО УМОЛЧАНИЮ 10
ТОБИШЬ НАДО ПРОПУСКАТЬ НОЛЬ ЗАПИСЕЙ
(pageNumber - 1) * pageSize


*/

    const amountSkip = (pageNumber - 1) * pageSize;

    /*  Сортировка данных,

      ORDER BY "${sortBy}" COLLATE "C" ${sortDirection}

    ---coртировать по названию колонки
    это название колонки а переменной sortBy

    ----COLLATE "C"   будет делать выжным большие и малые буквы
    при сортировке

    ---направление сортировки в переменной  sortDirection


    ........................................
            ----Для вывода данных порциями используется
    два оператора:

     LIMIT $3 OFFSET $4

    -limit - для ограничения количества записей из таблицы
  которое количество я хочу в результате получить---это
  число в переменной pageSize - по умолчанию 10

  -offset -это сколько записей надо пропустить,
   это в переменной amountSkip   ....например если
  лимит в 10 записей и от фронтенда просят 2-ую страницу,
  значит надо пропустить (2-1)*10 =  10 записей


    */

    const sortColumn =
      sortBy === 'blogName'
        ? `b."name" ${sortDirection}`
        : `p."${sortBy}"  ${sortDirection}`;

    /*    ----------- переменную sortColumn, которая будет
        содержать строку с выражением сортировки
        для использования в запросе. Значение sortBy
        используется для определения столбца, по
        которому будет выполняться сортировка, а
        sortDirection указывает направление сортировки
        (ASC или DESC). Если sortBy равно 'blogName',
          то sortColumn будет содержать выражение
        для сортировки по имени блога (b."name"
        ASC/DESC), иначе будет использоваться
        сортировка по указанному столбцу в таблице
        post.
    
    
        -------В данном случае, правило сортировки будет
        применяться к результату объединения
        (LEFT JOIN) таблиц post и blog, а не к отдельной
        таблице blog.
    
          В выражении SELECT p.*, b.name, мы выбираем
        все столбцы из таблицы post (p.*) и столбец
        name из таблицы blog (b.name). Затем, в
        выражении ORDER BY ${sortColumn}, мы
        указываем правило сортировки, которое
        будет применено к результату объединения
        этих таблиц.
    
          Таким образом, вы сортируете результатирующую
        таблицу, которая содержит данные из обеих
        таблиц post и blog, а не отдельно таблицу blog.
    
          Использование b."name" в выражении ORDER BY
        означает, что вы сортируете результаты по
        столбцу name из таблицы blog. Если вы хотите
        сортировать по другим столбцам, вам
        необходимо изменить значение переменной
        sortColumn соответственно.
    
          Итак, сортировка будет применяться к результату
        объединения таблиц post и blog, а не к отдельной
        таблице blog.*/

    const arrayPosts: CreatePostWithIdAndWithNameBlog[] =
      await this.dataSource.query(
        `
  SELECT p.*, b.name
  FROM public.post p
  LEFT JOIN public.blog b ON p."blogId" = b.id
  ORDER BY ${sortColumn}
  LIMIT $1 OFFSET $2
  `,
        [pageSize, amountSkip],
      );

    /* totalCountQuery - это запрос для получения общего
   количества записей. Здесь используется функция
    COUNT(*), которая подсчитывает все строки из
     таблицы "post" с учетом объединения с таблицей "blog".*/

    const totalCountQuery = await this.dataSource.query(
      `
  SELECT COUNT(*) AS value
  FROM public.post p
   LEFT JOIN public.blog b ON p."blogId" = b.id
 `,
    );

    const totalCount = Number(totalCountQuery[0].value);

    /*
pagesCount это число
Вычисляется общее количество страниц путем деления общего
количества документов на размер страницы (pageSize),
 и округление вверх с помощью функции Math.ceil.*/

    const pagesCount: number = Math.ceil(totalCount / pageSize);

    if (arrayPosts.length === 0) {
      return {
        pagesCount,
        page: pageNumber,
        pageSize: pageSize,
        totalCount,
        items: [],
      };
    }

    /*
далее перед отправкой на фронтенд 
приведу массив arrayPosts к тому виду
который ожидает  фронтенд
 и добавлю информацию из 
таблицы ЛАЙКИ к ПОСТАМ 

*/

    const viewArrayPosts: PostWithLikesInfo[] = await this.createViewArrayPosts(
      userId,
      arrayPosts,
    );

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: viewArrayPosts,
    };
  }

  async createViewArrayPosts(
    userId: string | null,
    arrayPosts: CreatePostWithIdAndWithNameBlog[],
  ) {
    /* из arrayPosts( массив постов)
    - достану из каждого поста  id(aйдишку поста)
    буду иметь массив айдишек */

    const arrayPostId: string[] = arrayPosts.map(
      (e: CreatePostWithIdAndWithNameBlog) => e.id,
    );

    /*из таблицы postlike
  достану все записи которые имеют id из 
   массива  arrayPostId .... плюс записи будут отсортированы
  (первая самая новая)*/

    const arrayPostLikeManyPostId: LikeStatusForPostWithId[] =
      await this.dataSource.query(
        `
      
          SELECT *
FROM public.postlike plike
WHERE plike."postId" IN (${arrayPostId.map((id, idx) => `$${idx + 1}`).join(', ')})
 ORDER BY plike."addedAt" DESC   
    
      
      `,
        arrayPostId,
      );

    /*в arrayPostLikeManyPostId будет  массив --- если не найдет запись ,  
   тогда ПУСТОЙ МАССИВ,   если найдет запись
   тогда  в массиве будетут обьекты */

    return arrayPosts.map((el: CreatePostWithIdAndWithNameBlog) => {
      /*    тут для каждого элемента из массива постов
          будет делатся ВЬЮМОДЕЛЬ которую ожидает 
          фронтенд, внутри будет информация об 
          посте и об лайках к этому посту*/
      if (arrayPostLikeManyPostId.length === 0) {
        const viewPostWithInfoLike = this.createViewModelOnePostWithLikeInfo(
          userId,
          el,
          arrayPostLikeManyPostId,
        );
        return viewPostWithInfoLike;
      } else {
        const currentPostId = el.id;
        const arrayPostLikeForCorrectPost = arrayPostLikeManyPostId.filter(
          (el: LikeStatusForPostWithId) => el.postId === currentPostId,
        );

        const viewPostWithInfoLike = this.createViewModelOnePostWithLikeInfo(
          userId,
          el,
          arrayPostLikeForCorrectPost,
        );
        return viewPostWithInfoLike;
      }
    });
  }

  async getPostsByCorrectBlogId(
    userId: string | null,
    blogId: string,
    queryParams: QueryParamsInputModel,
  ) {
    ///надо проверить существует ли такой blog

    const blog = await this.blogSqlRepository.findBlog(blogId);

    if (!blog) return null;

    const { sortBy, sortDirection, pageNumber, pageSize } = queryParams;

    /*   НАДО УКАЗЫВАТЬ КОЛИЧЕСТВО ПРОПУЩЕНЫХ 
   ЗАПИСЕЙ - чтобы получать следующие за ними

    ЗНАЧЕНИЯ ПО УМОЛЧАНИЯ В ФАЙЛЕ
    query-params-input-model.ts

   pageNumber по умолчанию 1, тобишь 
   мне надо первую страницу на фронтенд отдать
   , и это будут первые 10 записей из таблицы

 pageSize - размер  одной страницы, ПО УМОЛЧАНИЮ 10
   ТОБИШЬ НАДО ПРОПУСКАТЬ НОЛЬ ЗАПИСЕЙ
   (pageNumber - 1) * pageSize
 */

    const amountSkip = (pageNumber - 1) * pageSize;

    /*
  ФИЛЬТР БЫЛ ПО ВВЕДЕННЫМ СИМВОЛАМ-НАПОМНЮ
    -передается от фронта "Jo" для определенной колонки и
    если  есть записи в базе данных  и у этих записей
    у ДАННОЙ КОЛОКИ например существуют  "John",
      "Johanna" и "Jonathan", тогда эти  три записи будут
    выбраны и возвращен

    СЕЙЧАС ФИЛЬТР ПО  blogId



    */

    const result = await this.dataSource.query(
      `
       SELECT p.*, b.name
      FROM public.post p
      LEFT JOIN public.blog b ON p."blogId" = b.id
      WHERE p."blogId" = $1 
      ORDER BY p."${sortBy}" COLLATE "C" ${sortDirection}  
        LIMIT $2 OFFSET $3
     
      `,
      [blogId, pageSize, amountSkip],
    );

    /* totalCountQuery - это запрос для получения общего
 количества записей. Здесь используется функция
  COUNT(*), которая подсчитывает все строки из
   таблицы "post" с учетом объединения с таблицей "blog".*/

    const totalCountQuery = await this.dataSource.query(
      `
  SELECT COUNT(*) AS value
  FROM public.post p
  LEFT JOIN public.blog b ON p."blogId" = b.id
  WHERE p."blogId"  = $1
  `,
      [blogId],
    );

    const totalCount = Number(totalCountQuery[0].value);

    /*
pagesCount это число
Вычисляется общее количество страниц путем деления общего
количества документов на размер страницы (pageSize),
 и округление вверх с помощью функции Math.ceil.*/

    const pagesCount: number = Math.ceil(totalCount / pageSize);

    if (result.length === 0) {
      return {
        pagesCount,
        page: pageNumber,
        pageSize: pageSize,
        totalCount,
        items: [],
      };
    }

    /*
 далее перед отправкой на фронтенд 
 приведу массив result к тому виду
 который ожидает  фронтенд
  и добавлю информацию из 
 таблицы ЛАЙКИ к ПОСТАМ 
 
 */

    const viewArrayPosts: PostWithLikesInfo[] = await this.createViewArrayPosts(
      userId,
      result,
    );

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: viewArrayPosts,
    };
  }

  async getPostById(postId: string, userId: string | null) {
    /* найду одну запись post по айдишке, плюс значение
     * name из таблицы blog  И ДЛЯ ДАННОГО ПОСТА БУДЕТ
     * СУЩЕСТВОВАТЬ ОДИН БЛОГ И У НЕГО ВОЗМУ ЕГО name ,
     * это фронту надо инфу отдать  */

    const result = await this.dataSource.query(
      `
    select p.*,b.name
    from public.post p
    left join public.blog b
    on p."blogId"=b.id
    where p.id=$1
    `,
      [postId],
    );

    if (result.length === 0) return null;

    const post: CreatePostWithIdAndWithNameBlog = result[0];

    /* найду все записи из таблицы postlike
     для текущего поста
     ------сортировку по полю addedAt
     -------- сортировка в убывающем порядке , это означает, что самая первая запись будет самой новой записью*/

    const arrayPostLikeForOnePost: LikeStatusForPostWithId[] =
      await this.dataSource.query(
        `
    SELECT *
FROM public.postlike plike
WHERE plike."postId"=$1
 ORDER BY plike."addedAt" DESC   
    `,
        [postId],
      );

    /*в arrayPostLike будет  массив --- если не найдет запись ,
   тогда ПУСТОЙ МАССИВ,   если найдет запись
   тогда в массиве будетут  обьекты */

    const viewModelOnePostWithLikeInfo: PostWithLikesInfo =
      this.createViewModelOnePostWithLikeInfo(
        userId,
        post,
        arrayPostLikeForOnePost,
      );

    return viewModelOnePostWithLikeInfo;
  }

  createViewModelOnePostWithLikeInfo(
    userId: string | null,
    /* userId чтоб определить статус того 
  пользователя который данный запрос делает */

    post: CreatePostWithIdAndWithNameBlog,
    arrayPostLikeForOnePost: LikeStatusForPostWithId[],
  ) {
    /* из массива arrayPostLikeForOnePost  найду все
    со статусом Like   and    Dislike*/

    if (arrayPostLikeForOnePost.length === 0) {
      return {
        id: post.id,
        title: post.title,
        shortDescription: post.shortDescription,
        content: post.content,
        blogId: post.blogId,
        blogName: post.name,
        createdAt: post.createdAt,
        extendedLikesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: LikeStatus.NONE,
          newestLikes: [],
        },
      };
    } else {
      const arrayStatusLike: LikeStatusForPostWithId[] =
        arrayPostLikeForOnePost.filter((e) => e.likeStatus === LikeStatus.LIKE);

      const arrayStatusDislike: LikeStatusForPostWithId[] =
        arrayPostLikeForOnePost.filter(
          (e) => e.likeStatus === LikeStatus.DISLIKE,
        );

      /* получаю из массива со статусом Like
 три документа  новейших по дате
 --сортировку я произвел когда все документы
  ЛАЙКСТАТУСДЛЯПОСТОВ из   базыданных доставал */

      const threeDocumentWithLike: LikeStatusForPostWithId[] =
        arrayStatusLike.slice(0, 3);

      /*  надо узнать какой статус поставил пользователь данному посту, 
  тот пользователь который данный запрос делает - его айдишка
   имеется */

      let likeStatusCurrenttUser: LikeStatus;

      const result = arrayPostLikeForOnePost.find((e) => e.userId === userId);

      if (!result) {
        likeStatusCurrenttUser = LikeStatus.NONE;
      } else {
        likeStatusCurrenttUser = result.likeStatus;
      }

      /*  на фронтенд надо отдать масив с тремя обьектами
      И ТУТ ОПРЕДЕЛЕННУЮ СТРУКТУРУ СОЗДАЮ
        и в каждом обьекте информация об юзере 
        котрый ПОСТАВИЛ ПОЛОЖИТЕЛЬНЫЙ ЛАЙК СТАТУС и они 
        были установлены самыми крайними*/

      const threeLatestLike: NewestLikes[] = threeDocumentWithLike.map(
        (el: LikeStatusForPostWithId) => {
          return {
            userId: el.userId,
            addedAt: el.addedAt,
            login: el.login,
          };
        },
      );

      return {
        id: post.id,
        title: post.title,
        shortDescription: post.shortDescription,
        content: post.content,
        blogId: post.blogId,
        blogName: post.name,
        createdAt: post.createdAt,
        extendedLikesInfo: {
          likesCount: arrayStatusLike.length,
          dislikesCount: arrayStatusDislike.length,
          myStatus: likeStatusCurrenttUser,
          newestLikes: threeLatestLike,
        },
      };
    }
  }
}
