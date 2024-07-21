import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../domaims/domain-comment';
import { CommentWithLikeInfo } from '../types/views';
import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { LikeStatus } from '../../../common/types';

import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LikeStatusForCommentSqlRepository } from '../../like-status-for-comment/repositories/like-status-for-comment-sql-repository';
import { LikeStatusForCommentCreateWithId } from '../../like-status-for-comment/types/dto';
import { CreateCommentWithId } from '../api/types/dto';
import { PostSqlRepository } from '../../posts/repositories/post-sql-repository';

@Injectable()
export class CommentQuerySqlRepository {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectDataSource() protected dataSource: DataSource,
    protected likeStatusForCommentSqlRepository: LikeStatusForCommentSqlRepository,
    protected postSqlRepository: PostSqlRepository,
  ) {}

  async getCommentById(userId: string | null, commentId: string) {
    /*  сразу по commentId получу тот один комент который надо вернуть */

    const result = await this.dataSource.query(
      `
    SELECT *
FROM public.comment c
WHERE c.id = $1
    
    `,
      [commentId],
    );

    /*в result будет  массив --- если не найдет запись ,  
    тогда ПУСТОЙ МАССИВ,   если найдет запись
    тогда первым элементом в массиве будет обьект */

    if (result.length === 0) return null;

    const comment: CreateCommentWithId = result[0];

    /* найду записи с таблицы likecomment  для текущего >User чтобы узнать какой статус этот Юзер сделал */

    let statusCurrentUser: LikeStatus = LikeStatus.NONE;

    if (userId) {
      const likecommentsForCorrectUser: LikeStatusForCommentCreateWithId | null =
        await this.likeStatusForCommentSqlRepository.findLikeCommentForCorrectUser(
          userId,
          commentId,
        );

      if (likecommentsForCorrectUser) {
        statusCurrentUser = likecommentsForCorrectUser.likeStatus;
      }
    }

    /*   добываю все записи по лайкам которые относятся 
       к текущему коментарию---чтоб фронтенду отдать информацию КОЛИЧЕСТВО ЛАЙКОВ и ДИЗЛАЙКОВ для
       данного коментария*/

    const likecommentsForCorrectComent: LikeStatusForCommentCreateWithId[] =
      await this.likeStatusForCommentSqlRepository.findLikeCommentsForCorrectComment(
        commentId,
      );

    if (likecommentsForCorrectComent) {
      /* получаю  массив документов с Like*/

      const like: LikeStatusForCommentCreateWithId[] =
        likecommentsForCorrectComent.filter(
          (e) => e.likeStatus === LikeStatus.LIKE,
        );

      /* получаю  массив документов с DisLike*/

      const dislike: LikeStatusForCommentCreateWithId[] =
        likecommentsForCorrectComent.filter(
          (e) => e.likeStatus === LikeStatus.DISLIKE,
        );

      return {
        id: comment.id,
        content: comment.content,
        commentatorInfo: {
          userId: comment.userId,
          userLogin: comment.userLogin,
        },
        createdAt: comment.createdAt,
        likesInfo: {
          likesCount: like.length,
          dislikesCount: dislike.length,
          myStatus: statusCurrentUser,
        },
      };
    } else {
      return {
        id: comment.id,
        content: comment.content,
        commentatorInfo: {
          userId: comment.userId,
          userLogin: comment.userLogin,
        },
        createdAt: comment.createdAt,
        likesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: statusCurrentUser,
        },
      };
    }
  }

  async getComments(
    userId: string | null,
    postId: string,
    queryParams: QueryParamsInputModel,
  ) {
    //проверить существует ли такой ПОСТ

    const post = await this.postSqlRepository.getPost(postId);

    if (!post) return null;

    /*   в обьекте queryParams будут для каждого 
поля уже установленые значения по дефолту
согласно СВАГЕРУ---устанавливаются они 
на входе в ПАЙПЕ -файл query-params-user-input-model.ts
*/

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

Сортировка данных,

ORDER BY "${sortBy}" COLLATE "C" ${sortDirection} 

---coртировать по названию колонки order by
в данном примере -- ORDER BY  по значению
которое в переменной sortBy, по умолчанию это
значение 'createdAt', но от фронта может другое прийти 
ЗНАЧЕНИЯ ПО УМОЛЧАНИЯ В ФАЙЛЕ query-params-input-model.ts
---направление сортировки в переменной  sortDirection
НЕполучилось  ПОЛОЖИТЬ В ПАРАМЕТР , мол ключевые слова 
такие как ASC или DESC - нельзя в параметр( ? ) 
- поэтому вот таки синтаксисом




----Для вывода данных порциями используется
два оператора:

 LIMIT $1 OFFSET $2

-limit - для ограничения количества записей из таблицы
которое количество я хочу в результате получить---это
число в переменной pageSize - по умолчанию 10

-offset -это сколько записей надо пропустить,
это в переменной amountSkip   ....например если 
лимит в 10 записей и от фронтенда просят 2-ую страницу, 
значит надо пропустить (2-1)*10 =  10 записей


*/

    /* добавили COLLATE "C" после ORDER BY ${sortBy}  - это
   бинарный (binary) тип сравнения, который сохраняет 
   регистр символов при сортировке.*/

    const result = await this.dataSource.query(
      `
   SELECT *
  FROM public.comment 
  ORDER BY "${sortBy}" COLLATE "C" ${sortDirection}  
    LIMIT $1 OFFSET $2
 
  `,
      [pageSize, amountSkip],
    );

    /*в result будет  массив --- если не найдет запись ,
    тогда ПУСТОЙ МАССИВ,   если найдет запись
    тогда  в массиве будет обьектs 
      if (result.length === 0) return 
    */

    /*  totalCount  это---
 НАПОМНЮ Я В ЗАПРОСЕ ТОЛЬКО 10 (поумолчанию)
 записей просил 
А таких записей в таблице может быть много, и надо 
сделать запрос и узнать их количество и положить в переменную  totalCount
*/

    const totalCountQuery = await this.dataSource.query(
      `
  SELECT COUNT(*) AS value
  FROM public.comment
  
 `,
    );

    const totalCount = Number(totalCountQuery[0].value);

    /*
pagesCount это число
Вычисляется общее количество страниц путем деления общего количества документов на размер страницы (pageSize), и округление вверх с помощью функции Math.ceil.*/

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
далее перед отправкой на фронтенд- приведу к тому виду
который ожидает  фронтенд
*/

    const arrayComments: CommentWithLikeInfo[] = [];

    for (const comment of result) {
      /* найду записи с таблицы likecomment  для текущего сomment  */
      debugger;
      const likecommentsForCorrectComent: LikeStatusForCommentCreateWithId[] =
        await this.likeStatusForCommentSqlRepository.findLikeCommentsForCorrectComment(
          comment.id,
        );

      if (likecommentsForCorrectComent) {
        /* получаю  массив документов с Like*/

        const like: LikeStatusForCommentCreateWithId[] =
          likecommentsForCorrectComent.filter(
            (e) => e.likeStatus === LikeStatus.LIKE,
          );

        /* получаю  массив документов с DisLike*/

        const dislike: LikeStatusForCommentCreateWithId[] =
          likecommentsForCorrectComent.filter(
            (e) => e.likeStatus === LikeStatus.DISLIKE,
          );

        /*    если запись есть из масива
            likecommentsForCorrectComent
            НАЙДЕНАЯ ПО userId(ЕСЛИ САМА АЙДИШКА
            ЕСТЬ ИБО МОЖЕТ null)--если нету то дефолтное
            значение  myStatus-None*/

        let statusCurrentUser: LikeStatus = LikeStatus.NONE;

        if (userId) {
          const result: LikeStatusForCommentCreateWithId | undefined =
            likecommentsForCorrectComent.find((e) => e.userId === userId);

          if (result) {
            statusCurrentUser = result.likeStatus;
          } else {
            statusCurrentUser = LikeStatus.NONE;
          }
        }

        arrayComments.push({
          id: comment.id,
          content: comment.content,
          commentatorInfo: {
            userId: comment.userId,
            userLogin: comment.userLogin,
          },
          createdAt: comment.createdAt,
          likesInfo: {
            likesCount: like.length,
            dislikesCount: dislike.length,
            myStatus: statusCurrentUser,
          },
        });
      } else {
        /*  создаст вью модель
          которую ожидает фронтенд для 
          ОДНОГО КОМЕНТАРИЯ когда данные
          likesCount и dislikesCount и myStatus
          будут по дефолту- нулевые */

        arrayComments.push({
          id: comment.id,
          content: comment.content,
          commentatorInfo: {
            userId: comment.userId,
            userLogin: comment.userLogin,
          },
          createdAt: comment.createdAt,
          likesInfo: {
            likesCount: 0,
            dislikesCount: 0,
            myStatus: LikeStatus.NONE,
          },
        });
      }
    }

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: arrayComments,
    };
  }
}
