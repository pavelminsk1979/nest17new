import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LikeStatusForCommentSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async findLikeCommentForCorrectUser(userId: string, commentId: string) {
    /* Если документ не будет найден, 
    метод findOne() вернет null.*/

    const result = await this.dataSource.query(
      `
    
     SELECT *
    FROM public.likecomment lcom
    where lcom."userId"=1$ AND  lcom."commentId"=2$
    
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
    where lcom."commentId"=1$
    
    `,
      [commentId],
    );

    /*в result будет  массив записей
    (массив обьектов) --- если не найдет запись ,
    тогда ПУСТОЙ МАССИВ,   */
    if (result.length === 0) return null;
    return result;
  }

  /*  async save(newLikeStatusForComment: LikeStatusForCommentDocument) {
    return newLikeStatusForComment.save();
  }

  async findAllDocumentsByArrayCommentId(arrayCommentId: string[]) {
    /!* массив в котором каждый элемент это айдишкаКоментария
 и по этим айдишкам найдет все существующие документы*!/

    return this.likeStatusModelForComment.find({
      commentId: { $in: arrayCommentId },
    });
  }

  async findAllDocumentsByCommentId(
    commentId: string,
  ): Promise<LikeStatusForCommentDocument[]> {
    return this.likeStatusModelForComment.find({ commentId });
  }*/
}
