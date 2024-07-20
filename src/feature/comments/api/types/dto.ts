export type CreateComment = {
  content: string;
  postId: string;
  createdAt: string;
  userId: string;
  userLogin: string;
};

export type CreateCommentWithId = {
  id: string;
  content: string;
  postId: string;
  createdAt: string;
  userId: string;
  userLogin: string;
};
