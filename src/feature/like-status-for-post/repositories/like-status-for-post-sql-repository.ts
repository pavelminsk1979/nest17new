import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LikeStatusForPost } from '../domain/domain-like-status-for-post';
import { LikeStatus } from '../../../common/types';

@Injectable()
export class LikeStatusForPostSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async findLikePostByUserIdAndPostId(userId: string, postId: string) {
    const result = await this.dataSource.query(
      `
    
    SELECT *
FROM public.postlike plike
WHERE plike."userId"=$1 AND plike."postId"=$2
    
    `,
      [userId, postId],
    );

    /*в result будет  массив --- если не найдет запись ,  
 тогда ПУСТОЙ МАССИВ,   если найдет запись
 тогда первым элементом в массиве будет обьект */
    if (result.length === 0) return null;
    return result[0];
  }

  async createLikePost(newLikePost: LikeStatusForPost) {
    const result = await this.dataSource.query(
      `
   INSERT INTO public.postlike(
"userId", "postId", "likeStatus", "addedAt", login)
VALUES ($1,$2,$3,$4,$5); 

    
    `,
      [
        newLikePost.userId,
        newLikePost.postId,
        newLikePost.likeStatus,
        newLikePost.addedAt,
        newLikePost.login,
      ],
    );

    /*вернётся пустой массив или null*/
    if (!result) return false;

    return true;
  }

  async changeLikePost(
    idCurrentLikePost: string,
    currentlikeStatus: LikeStatus,
    currentAddedAt: string,
  ) {
    const result = await this.dataSource.query(
      `
UPDATE public.postlike
SET "likeStatus"=$1, "addedAt"=$2
WHERE id=$3;

    
    `,
      [currentlikeStatus, currentAddedAt, idCurrentLikePost],
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
