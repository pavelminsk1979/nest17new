export type CreatePost = {
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  createdAt: string;
};

export type CreatePostWithIdAndWithNameBlog = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  createdAt: string;
  name: string;
};
