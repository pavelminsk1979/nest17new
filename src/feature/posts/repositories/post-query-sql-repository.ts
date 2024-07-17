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

    const result = await this.dataSource.query(
      `
  SELECT p.*, b.name
  FROM public.post p
  LEFT JOIN public.blog b ON p."blogId" = b.id
  ORDER BY p."${sortBy}" COLLATE "C" ${sortDirection}
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

    /*    ///////////////////////////////////////////////////

        const sortDirectionValue = sortDirection === 'asc' ? 1 : -1;

        const posts: PostDocument[] = await this.postModel
          .find({})

          .sort({ [sortBy]: sortDirectionValue })

          .skip((pageNumber - 1) * pageSize)

          .limit(pageSize)

          .exec();

        const totalCount: number = await this.postModel.countDocuments({});

        const pagesCount: number = Math.ceil(totalCount / pageSize);

        /!* Если в коллекции postModel не будет постов ,
         тогда  метод find вернет пустой
     массив ([]) в переменную posts.*!/

        if (posts.length === 0) {
          return {
            pagesCount,
            page: pageNumber,
            pageSize: pageSize,
            totalCount,
            items: [],
          };
        }

        const arrayPosts: PostWithLikesInfo[] = await this.makeArrayPosts(
          userId,
          posts,
        );

        return {
          pagesCount,
          page: pageNumber,
          pageSize: pageSize,
          totalCount,
          items: arrayPosts,
        };
      }

      async makeArrayPosts(userId: string | null, posts: PostDocument[]) {
        /!* из posts( массив постов)
        - достану из каждого поста  _id(aйдишку поста)
        буду иметь массив айдишек *!/

        const arrayPostId: string[] = posts.map((e) => e._id.toString());

        /!*из коллекции LikeStatusForPost
        достану все документы которые относятся
        к постам полученым (по айдишка)  плюс они будут отсортированы
        (первый самый новый)*!/

        const allLikeStatusDocumentsForCurrentPosts: LikeStatusForPostDocument[] =
          await this.likeStatusForPostRepository.findAllDocumentsByArrayPostId(
            arrayPostId,
          );

        /!* создаю массив постов с информацией о лайках
        (он пойдет на фронтенд)
        мапом прохожу и для каждого поста
        делаю операции для получения обьекта   тип- PostWithLikesInfo *!/

        /!* ЗДЕСЬ return  возвращает наружу  результат
         работы метода map*!/
        return posts.map((post: PostDocument) => {
          /!* отдельный метод (createAlonePostWithLikeInfo) который создае
           один пост со всеми вложеностями
           -с информацией о лайках*!/

          const postWithLikeInfo = this.createAlonePostWithLikeInfo(
            userId,
            post,
            allLikeStatusDocumentsForCurrentPosts,
          );

          /!*один обьект (postWithLikeInfo) методе map  создан и ретурном
           помещен в  результатирующий массив*!/
          return postWithLikeInfo;
        });
      }

      createAlonePostWithLikeInfo(
        userId: string | null,
        /!* userId чтоб определить статус того
       пользователя который данный запрос делает *!/

        post: PostDocument,
        allLikeStatusDocumentsForCurrentPosts: LikeStatusForPostDocument[],
      ) {
        /!*для одного поста нахожу все документы
        из массива ЛАЙКОВ *!/

        const allLikeStatusDocumentsForCurrentPost: LikeStatusForPostDocument[] =
          allLikeStatusDocumentsForCurrentPosts.filter(
            (e) => e.postId === post._id.toString(),
          );

        /!* получаю  массив документов с Like*!/

        const like: LikeStatusForPostDocument[] =
          allLikeStatusDocumentsForCurrentPost.filter(
            (e) => e.likeStatus === LikeStatus.LIKE,
          );

        /!* получаю  массив документов с DisLike*!/

        const dislike: LikeStatusForPostDocument[] =
          allLikeStatusDocumentsForCurrentPost.filter(
            (e) => e.likeStatus === LikeStatus.DISLIKE,
          );

        /!* получаю из массива со статусом Like
        три документа  новейших по дате
        --сортировку я произвел когда все документы
         ЛАЙКСТАТУСДЛЯПОСТОВ из   базыданных доставал *!/

        const threeDocumentWithLike: LikeStatusForPostDocument[] = like.slice(0, 3);

        /!*  надо узнать какой статус поставил пользователь данному посту,
          тот пользователь который данный запрос делает - его айдишка
           имеется *!/

        let likeStatusCurrentPostCurrentUser: LikeStatus;

        const result = allLikeStatusDocumentsForCurrentPost.find(
          (e) => e.userId === userId,
        );

        if (!result) {
          likeStatusCurrentPostCurrentUser = LikeStatus.NONE;
        } else {
          likeStatusCurrentPostCurrentUser = result.likeStatus;
        }

        /!*
          ---post: PostDocument- нахожусь внутри метода map
          и post - это текущий документ
          ----like/dislike: LikeStatusForPostDocument[] массивы -
          длинны их использую
          ---likeStatusCurrentPostCurrentUser: LikeStatus - статус
          пользователя который текущий запрос делает
          ---threeDocumentWithLike: LikeStatusForPostDocument[]
          три документа - это самые последние(новые) которые
          ЛАЙК этому посту поставили
         *!/

        const threeLatestLike: NewestLikes[] = threeDocumentWithLike.map(
          (el: LikeStatusForPostDocument) => {
            return {
              userId: el.userId,
              addedAt: el.addedAt,
              login: el.login,
            };
          },
        );

        const extendedLikesInfo: ExtendedLikesInfo = {
          likesCount: like.length,
          dislikesCount: dislike.length,
          myStatus: likeStatusCurrentPostCurrentUser,
          newestLikes: threeLatestLike,
        };

        return {
          id: post._id.toString(),
          title: post.title,
          shortDescription: post.shortDescription,
          content: post.content,
          blogId: post.blogId,
          blogName: post.blogName,
          createdAt: post.createdAt,
          extendedLikesInfo,
        };
      }

      async getPostsByCorrectBlogId(
        userId: string | null,
        blogId: string,
        queryParams: QueryParamsInputModel,
      ) {
        ///надо проверить существует ли такой blog

        const blog = await this.blogRepository.findBlog(blogId);

        if (!blog) return null;

        const { sortBy, sortDirection, pageNumber, pageSize } = queryParams;

        const sortDirectionValue = sortDirection === 'asc' ? 1 : -1;

        const filter = { blogId };

        const posts: PostDocument[] = await this.postModel
          .find(filter)

          .sort({ [sortBy]: sortDirectionValue })

          .skip((pageNumber - 1) * pageSize)

          .limit(pageSize)

          .exec();

        const totalCount: number = await this.postModel.countDocuments(filter);

        const pagesCount: number = Math.ceil(totalCount / pageSize);

        /!* Если в коллекции postModel не будет документов,
           c указаным  blogId , то метод find вернет пустой
         массив ([]) в переменную posts.*!/

        if (posts.length === 0) {
          return {
            pagesCount,
            page: pageNumber,
            pageSize: pageSize,
            totalCount,
            items: [],
          };
        }

        const arrayPosts: PostWithLikesInfo[] = await this.makeArrayPosts(
          userId,
          posts,
        );

        return {
          pagesCount,
          page: pageNumber,
          pageSize: pageSize,
          totalCount,
          items: arrayPosts,
        };
      }*/
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

    //////////////////////////////////////////////////////////

    /*  const post: PostDocument | null = await this.postModel.findById(postId);

      if (!post) return null;

      /!* найду все документы LikeStatus для текущего поста
       * если ничего не найдет то вернет пустой массив*!/

      const allDocumentsLikeStatus: LikeStatusForPostDocument[] =
        await this.likeStatusForPostRepository.findAllDocumentByPostId(postId);

      const postWithLikeInfo = this.createAlonePostWithLikeInfo(
        userId,
        post,
        allDocumentsLikeStatus,
      );

      return postWithLikeInfo;*/
  }

  /*  ЭТОТ МЕТОД ДЛЯ СОЗДАНИЯ ВИДА !!! НОВОГО ПОСТА !!!
   * отличатся будет потомучто у нового поста еще не будет
   * лайков и поэтому значения лайков будут нулевые
   * вобще нет запросов за лайками в базу данных
   * */
  /*  createViewModelNewPost(post: PostDocument): PostWithLikesInfo {
      return {
        id: post._id.toString(),
        title: post.title,
        shortDescription: post.shortDescription,
        content: post.content,
        blogId: post.blogId,
        blogName: post.blogName,
        createdAt: post.createdAt,
        extendedLikesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: LikeStatus.NONE,
          newestLikes: [
            {
              addedAt: '',
              userId: '',
              login: '',
            },
          ],
        },
      };
    }*/
}

/*

async getPostById(postId: string) {
  const post: PostDocument | null = await this.postModel.findById(postId);

  if (post) {
    return this.createViewModelNewPost(post);
  } else {
    return null;
  }
}

/!*  ЭТОТ МЕТОД ДЛЯ СОЗДАНИЯ ВИДА !!! НОВОГО ПОСТА !!!
 * отличатся будет потомучто у нового поста еще не будет
 * лайков и поэтому значения лайков будут нулевые
 * вобще нет запросов за лайками в базу данных
 * *!/
createViewModelNewPost(post: PostDocument): PostWithLikesInfo {
  return {
    id: post._id.toString(),
    title: post.title,
    shortDescription: post.shortDescription,
    content: post.content,
    blogId: post.blogId,
    blogName: post.blogName,
    createdAt: post.createdAt,
    extendedLikesInfo: {
      likesCount: 0,
      dislikesCount: 0,
      myStatus: LikeStatus.NONE,
      newestLikes: [
        {
          addedAt: '',
          userId: '',
          login: '',
        },
      ],
    },
  };
}*/
