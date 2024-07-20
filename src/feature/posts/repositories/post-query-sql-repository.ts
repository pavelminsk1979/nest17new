import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostDocument } from '../domains/domain-post';

import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { LikeStatusForPostRepository } from '../../like-status-for-post/repositories/like-status-for-post-repository';

import { LikeStatus } from '../../../common/types';
import { BlogRepository } from '../../blogs/repositories/blog-repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostWithLikesInfo } from '../api/types/views';
import { CreatePostWithIdAndWithNameBlog } from '../api/types/dto';
import { BlogSqlRepository } from '../../blogs/repositories/blog-sql-repository';

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
    protected likeStatusForPostRepository: LikeStatusForPostRepository,
    protected blogRepository: BlogRepository,
    @InjectDataSource() protected dataSource: DataSource,
    protected blogSqlRepository: BlogSqlRepository,
  ) {}

  async getPosts(queryParamsPostForBlog: QueryParamsInputModel) {
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

    const result = await this.dataSource.query(
      `
  SELECT p.*, b.name
  FROM public.post p
  LEFT JOIN public.blog b ON p."blogId" = b.id
  ORDER BY ${sortColumn}
  LIMIT $1 OFFSET $2
  `,
      [pageSize, amountSkip],
    );

    /*
далее перед отправкой на фронтенд отмамплю записи из
базы данных и добавлю поля - приведу к тому виду
который ожидает  фронтенд
*/

    const arrayPosts: PostWithLikesInfo[] = result.map(
      (post: CreatePostWithIdAndWithNameBlog) => {
        return this.createViewModelPost(post);
      },
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

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: arrayPosts,
    };
  }

  createViewModelPost(
    post: CreatePostWithIdAndWithNameBlog,
  ): PostWithLikesInfo {
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
  }

  async getPostsByCorrectBlogId(
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

    /*
далее перед отправкой на фронтенд отмамплю записи из
базы данных и добавлю поля - приведу к тому виду
который ожидает  фронтенд
*/

    const arrayPosts: PostWithLikesInfo[] = result.map(
      (post: CreatePostWithIdAndWithNameBlog) => {
        return this.createViewModelPost(post);
      },
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

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: arrayPosts,
    };
  }

  async getPostById(postId: string) {
    /* нужны данные ПО ЗАПРОСУ ФРОНТАА
     ИЗ таблицы post и ИЗ таблицы blog */

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

    return {
      id: result[0].id,
      title: result[0].title,
      shortDescription: result[0].shortDescription,
      content: result[0].content,
      blogId: result[0].blogId,
      blogName: result[0].name,
      createdAt: result[0].createdAt,
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: LikeStatus.NONE,
        newestLikes: [],
      },
    };
  }
}
