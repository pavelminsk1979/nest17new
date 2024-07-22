import { LikeStatus } from '../../../common/types';

export type LikeStatusForPost = {
  userId: string;
  postId: string;
  likeStatus: LikeStatus;
  addedAt: string;
  login: string;
};

export type LikeStatusForPostWithId = {
  id: string;
  userId: string;
  postId: string;
  likeStatus: LikeStatus;
  addedAt: string;
  login: string;
};
