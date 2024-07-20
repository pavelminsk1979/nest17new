import { LikeStatus } from '../../../common/types';

export type LikeStatusForCommentCreate = {
  userId: string;
  commentId: string;
  likeStatus: LikeStatus;
  addedAt: string;
};

export type LikeStatusForCommentCreateWithId = {
  id: string;
  userId: string;
  commentId: string;
  likeStatus: LikeStatus;
  addedAt: string;
};
