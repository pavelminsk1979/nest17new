import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LikeStatusForCommentCreate } from '../types/dto';
import { LikeStatus } from '../../../common/types';

@Injectable()
export class LikeStatusForCommentSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async findLikeCommentForCorrectUser(userId: string, commentId: string) {
    const result = await this.dataSource.query(
      `
    
     SELECT *
    FROM public.likecomment lcom
    where lcom."userId"=$1 AND  lcom."commentId"=$2
    
    `,
      [userId, commentId],
    );

    /*в result будет  массив --- если не найдет запись ,
    тогда ПУСТОЙ МАССИВ,   если найдет запись
    тогда первым элементом в массиве будет обьект */
    if (result.length === 0) return null;
    return result[0];
  }

  async findLikeCommentsForCorrectComment(commentId: string) {
    const result = await this.dataSource.query(
      `
    
     SELECT *
    FROM public.likecomment lcom
    where lcom."commentId"=$1
    
    `,
      [commentId],
    );

    /*в result будет  массив записей
    (массив обьектов) --- если не найдет запись ,
    тогда ПУСТОЙ МАССИВ,   */
    if (result.length === 0) return null;
    return result;
  }

  async findLikeCommentByUserIdAndCommentId(userId: string, commentId: string) {
    const result = await this.dataSource.query(
      `
    
 SELECT *
FROM public.likecomment likecom
WHERE likecom."userId"=$1 AND likecom."commentId"=$2
    
   `,
      [userId, commentId],
    );

    /*в result будет  массив --- если не найдет запись ,  
 тогда ПУСТОЙ МАССИВ,   если найдет запись
 тогда первым элементом в массиве будет обьект */
    if (result.length === 0) return null;
    return result[0];
  }

  async createLikeComment(newLikeComment: LikeStatusForCommentCreate) {
    const result = await this.dataSource.query(
      `
    
    INSERT INTO public.likecomment(
"userId", "commentId", "likeStatus", "addedAt")
VALUES ( $1,$2,$3,$4);
    
    `,
      [
        newLikeComment.userId,
        newLikeComment.commentId,
        newLikeComment.likeStatus,
        newLikeComment.addedAt,
      ],
    );

    /*вернётся пустой массив или null*/
    if (!result) return false;

    return true;
  }

  async changeLikeComment(
    idCurrentLikeComment: string,
    currentlikeStatus: LikeStatus,
    currentAddedAt: string,
  ) {
    const result = await this.dataSource.query(
      `
    
    UPDATE public.likecomment
SET  "likeStatus"=$1, "addedAt"=$2
WHERE id=$3;
    
    `,
      [currentlikeStatus, currentAddedAt, idCurrentLikeComment],
    );

    /*    в result будет всегда массив и всегда первым
   элементом будет ПУСТОЙ МАССИВ, а вторым элементом
   или НОЛЬ(если ничего не изменилось) или число-сколько
   строк изменилось(в данном случае еденица будет 
вторым элементом масива )*/

    if (result[1] === 0) return false;

    return true;
  }
}
