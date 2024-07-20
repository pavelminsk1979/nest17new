import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../domaims/domain-comment';
import { CommentWithLikeInfo, LikesInfo } from '../types/views';
import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { LikeStatus } from '../../../common/types';
import { LikeStatusForCommentDocument } from '../../like-status-for-comment/domain/domain-like-status-for-comment';
import { LikeStatusForCommentRepository } from '../../like-status-for-comment/repositories/like-status-for-comment-repository';
import { PostRepository } from '../../posts/repositories/post-repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LikeStatusForCommentSqlRepository } from '../../like-status-for-comment/repositories/like-status-for-comment-sql-repository';
import { LikeStatusForCommentCreateWithId } from '../../like-status-for-comment/types/dto';
import { CreateCommentWithId } from '../api/types/dto';

@Injectable()
export class CommentQuerySqlRepository {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    protected likeStatusForCommentRepository: LikeStatusForCommentRepository,
    protected postRepository: PostRepository,
    @InjectDataSource() protected dataSource: DataSource,
    protected likeStatusForCommentSqlRepository: LikeStatusForCommentSqlRepository,
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
        statusCurrentUser = likecommentsForCorrectUser[0].likeStatus;
      }
    }

    /*   добываю все записи по лайкам которые относятся 
       к текущему коментарию---чтоб фронтенду отдать информацию КОЛИЧЕСТВО ЛАЙКОВ и ДИЗЛАЙКОВ для
       данного коментария*/

    const likecommentsForCorrectComent: LikeStatusForCommentCreateWithId[] =
      await this.likeStatusForCommentSqlRepository.findLikeCommentsForCorrectComment(
        commentId,
      );

    if (!likecommentsForCorrectComent) {
      return this.createAloneComment(comment, statusCurrentUser);
    }

    return this.createCommentWithLikeInfo(
      comment,
      statusCurrentUser,
      likecommentsForCorrectComent,
    );
  }

  createAloneComment(
    comment: CreateCommentWithId,
    statusCurrentUser: LikeStatus,
  ) {
    /* этот метод создаст вью модель
     которую ожидает фронтенд
     ОДНОГО КОМЕНТАРИЯ когда данные
     likesCount и dislikesCount и myStatus 
     будут по дефолту -- или их еще не создано
     или нету userId*/

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

  createCommentWithLikeInfo(
    comment: CreateCommentWithId,
    statusCurrentUser: LikeStatus,
    likecommentsForCorrectComent: LikeStatusForCommentCreateWithId[],
  ) {
    debugger;
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
  }

  createAloneCommentWithLikeInfo(
    userId: string | null,
    /* userId чтоб определить статус того 
пользователя который данный запрос делает */

    comment: CommentDocument,
    /* нахожусь внутри метода map
   и comment - это текущий документ*/

    allLikeStatusDocumentsForSortComments: LikeStatusForCommentDocument[],
    /*  ТО ВСЕ ЛАЙКИ КО ВСЕМ
  ЭТИМ КОМЕНТАРИЯМ которые отдам на фронтенд*/
  ) {
    /*для текущего комента  нахожу все документы
    из массива ЛАЙКОВ */

    const allLikeStatusDocumentForAloneComment: LikeStatusForCommentDocument[] =
      allLikeStatusDocumentsForSortComments.filter(
        (e) => e.commentId === comment._id.toString(),
      );

    /* получаю  массив документов с Like*/

    const like: LikeStatusForCommentDocument[] =
      allLikeStatusDocumentForAloneComment.filter(
        (e) => e.likeStatus === LikeStatus.LIKE,
      );

    /* получаю  массив документов с DisLike*/

    const dislike: LikeStatusForCommentDocument[] =
      allLikeStatusDocumentForAloneComment.filter(
        (e) => e.likeStatus === LikeStatus.DISLIKE,
      );

    /*  надо узнать какой статус поставил пользователь данному коменту,
    тот пользователь который данный запрос делает - его айдишка
     имеется */

    let myStatus: LikeStatus;

    const result = allLikeStatusDocumentForAloneComment.find(
      (e) => e.userId === userId,
    );

    if (result) {
      myStatus = result.likeStatus;
    } else {
      myStatus = LikeStatus.NONE;
    }

    const likesInfo: LikesInfo = {
      likesCount: like.length,
      dislikesCount: dislike.length,
      myStatus,
    };

    return {
      id: comment._id.toString(),
      content: comment.content,
      commentatorInfo: {
        userId: comment.commentatorInfo.userId,
        userLogin: comment.commentatorInfo.userLogin,
      },
      createdAt: comment.createdAt,
      likesInfo,
    };
  }

  //////////////////////////////////////////////

  async getComments(
    userId: string | null,
    postId: string,
    queryParams: QueryParamsInputModel,
  ) {
    //проверить существует ли такой ПОСТ

    const post = await this.postRepository.getPostById(postId);

    if (!post) return null;

    const { sortBy, sortDirection, pageNumber, pageSize } = queryParams;

    const sortDirectionValue = sortDirection === 'asc' ? 1 : -1;

    /*  Переменная filter используется для создания фильтра запроса в базу данных MongoDB*/

    const filter = { postId };

    const comments: CommentDocument[] = await this.commentModel

      .find(filter)

      .sort({ [sortBy]: sortDirectionValue })

      .skip((pageNumber - 1) * pageSize)

      .limit(pageSize)

      .exec();

    const totalCount: number = await this.commentModel.countDocuments(filter);

    const pagesCount: number = Math.ceil(totalCount / pageSize);

    /* Если в коллекции CommentDocument не будет документов,
   у которых поле postId заявленое, то метод find вернет пустой
 массив ([]) */

    if (comments.length === 0) {
      return {
        pagesCount,
        page: pageNumber,
        pageSize: pageSize,
        totalCount,
        items: [],
      };
    }

    const arrayComments: CommentWithLikeInfo[] = await this.makeArrayComments(
      userId,
      comments,
    );

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: arrayComments,
    };
  }

  async makeArrayComments(
    userId: string | null,
    comments: CommentDocument[],
  ): Promise<CommentWithLikeInfo[]> {
    /* из массива коментариев получу массив коментарийАЙДИ*/

    const arrayCommentId = comments.map((e) => e._id.toString());
    //console.log(arrayCommentId);
    /*из коллекции LikeStatusForComment
    достану все документы в  которых  имеются commentId
   из массива  arrayCommentsId*/

    const allLikeStatusDocumentsForSortComments: LikeStatusForCommentDocument[] =
      await this.likeStatusForCommentRepository.findAllDocumentsByArrayCommentId(
        arrayCommentId,
      );
    //console.log(allLikeStatusDocumentsForSortComments);
    /*создаю массив c данными о коментариях и  с информацией о
     лайках к этому коментарию
    (он пойдет на фронтенд)
    мапом прохожу и для каждого поста
    делаю операции для получения обьекта   тип- CommentWithLikeInfo*/

    /* ЗДЕСЬ return  возвращает наружу  результат 
   работы метода map (массив коментариев с информацией о лайках)*/
    return comments.map((comment: CommentDocument) => {
      /* отдельный метод (createAloneCommentWithLikeInfo) который создаст 
      один комент со всеми вложеностями
      -с информацией о лайках*/

      const commentWithLikeInfo: CommentWithLikeInfo =
        this.createAloneCommentWithLikeInfo(
          userId,
          comment,
          allLikeStatusDocumentsForSortComments,
        );

      return commentWithLikeInfo;
    });
  }
}
