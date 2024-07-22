import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../domaims/domain-comment';
import { CommentRepository } from '../reposetories/comment-repository';
import { LikeStatus } from '../../../common/types';
import {
  LikeStatusForComment,
  LikeStatusForCommentDocument,
} from '../../like-status-for-comment/domain/domain-like-status-for-comment';
import { LikeStatusForCommentRepository } from '../../like-status-for-comment/repositories/like-status-for-comment-repository';
import { PostSqlRepository } from '../../posts/repositories/post-sql-repository';
import { UsersSqlRepository } from '../../users/repositories/user-sql-repository';
import { CreateComment } from '../api/types/dto';
import { CommentSqlRepository } from '../reposetories/comment-sql-repository';
import {
  LikeStatusForCommentCreate,
  LikeStatusForCommentCreateWithId,
} from '../../like-status-for-comment/types/dto';
import { LikeStatusForCommentSqlRepository } from '../../like-status-for-comment/repositories/like-status-for-comment-sql-repository';

@Injectable()
/*@Injectable()-декоратор что данный клас
 инжектируемый--тобишь в него добавляются
 зависимости
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ  В ФАЙЛ app.module
 * providers: [AppService,UsersService]
 провайдер-это в том числе компонент котоый
 возможно внедрить как зависимость*/
export class CommentService {
  constructor(
    protected commentRepository: CommentRepository,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(LikeStatusForComment.name)
    private likeStatusModelForComment: Model<LikeStatusForCommentDocument>,
    protected postSqlRepository: PostSqlRepository,
    protected usersSqlRepository: UsersSqlRepository,
    protected commentSqlRepository: CommentSqlRepository,
    protected likeStatusForCommentSqlRepository: LikeStatusForCommentSqlRepository,
  ) {}

  async createComment(userId: string, postId: string, content: string) {
    /*надо проверить существует ли такой
    документ-post в базе */

    const post = await this.postSqlRepository.getPost(postId);

    if (!post) return null;

    /* надо достать документ user по userId
    и из него взять userLogin*/

    const user = await this.usersSqlRepository.getUserById(userId);

    if (!user) return null;

    const userLogin = user.login;

    const newComment: CreateComment = {
      content,
      createdAt: new Date().toISOString(),
      postId,
      userId,
      userLogin,
    };

    const commentId: string | null =
      await this.commentSqlRepository.createComment(newComment);

    if (!commentId) return null;

    return commentId;
  }

  async updateComment(userId: string, commentId: string, content: string) {
    //нахожу коментарий в базе данных

    const comment = await this.commentSqlRepository.findCommentById(commentId);

    if (!comment) return false;

    /*   проверяю что этот коментарий принадлежит
   пользователю который  хочет его изменить */

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'comment not belong current user :method put  ,url /comments/commentId',
      );
    }

    /*изменяю в документе comment содержимое
поля comment*/
    const newContent = content;

    const idComment = comment.id;

    //сохраняю в базу измененный документ

    return await this.commentSqlRepository.changeComment(idComment, newContent);
  }

  async deleteCommentById(userId: string, commentId: string) {
    const comment = await this.commentRepository.findCommentById(commentId);

    if (!comment) return null;

    /*   проверяю что этот коментарий принадлежит
   пользователю который  хочет его изменить */

    if (comment.commentatorInfo.userId !== userId) {
      throw new ForbiddenException(
        'comment not belong current user :method delete   ,url /comments/commentId',
      );
    }

    return this.commentRepository.deleteCommentById(commentId);
  }

  async setLikestatusForComment(
    userId: string,
    commentId: string,
    likeStatus: LikeStatus,
  ) {
    /* проверка- существует ли в базе такой коментарий*/

    const comment = await this.commentSqlRepository.findCommentById(commentId);

    if (!comment) return false;

    /*    ищу в базе ЛайковДляКоментариев  один документ   по  двум полям userId и commentId---*/

    const likeComment: LikeStatusForCommentCreateWithId | null =
      await this.likeStatusForCommentSqlRepository.findLikeCommentByUserIdAndCommentId(
        userId,
        commentId,
      );

    if (!likeComment) {
      /*Если документа  нет тогда надо cоздать
      новый документ и добавить в базу*/

      const newLikeComment: LikeStatusForCommentCreate = {
        userId,
        commentId,
        likeStatus,
        addedAt: new Date().toISOString(),
      };

      return await this.likeStatusForCommentSqlRepository.createLikeComment(
        newLikeComment,
      );
    }

    /*Если документ есть тогда надо изменить
     statusLike в нем на приходящий и установить теперещнюю дату
      установки */

    const currentlikeStatus = likeStatus;

    const currentAddedAt = new Date().toISOString();

    const idCurrentLikeComment = likeComment.id;

    return await this.likeStatusForCommentSqlRepository.changeLikeComment(
      idCurrentLikeComment,
      currentlikeStatus,
      currentAddedAt,
    );
  }
}
