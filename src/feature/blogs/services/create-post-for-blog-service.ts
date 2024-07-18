import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogDocument } from '../domains/domain-blog';
import { Post, PostDocument } from '../../posts/domains/domain-post';
import { CreatePostForBlogInputModel } from '../api/pipes/create-post-for-blog-input-model';
import { CommandHandler } from '@nestjs/cqrs';
import { BlogSqlRepository } from '../repositories/blog-sql-repository';
import { CreatePost } from '../../posts/api/types/dto';
import { PostSqlRepository } from '../../posts/repositories/post-sql-repository';

export class CreatePostForBlogCommand {
  constructor(
    public blogId: string,
    public createPostForBlogInputModel: CreatePostForBlogInputModel,
  ) {}
}

@CommandHandler(CreatePostForBlogCommand)
@Injectable()
export class CreatePostForBlogService {
  constructor(
    protected blogSqlRepository: BlogSqlRepository,
    protected postSqlRepository: PostSqlRepository,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async execute(command: CreatePostForBlogCommand) {
    const { title, content, shortDescription } =
      command.createPostForBlogInputModel;
    const blogId = command.blogId;

    const blog: BlogDocument | null =
      await this.blogSqlRepository.findBlog(blogId);

    if (!blog) return null;

    /* создаю документ post */
    const newPost: CreatePost = {
      title,
      shortDescription,
      content,
      blogId,
      createdAt: new Date().toISOString(),
    };

    const postId: string | null =
      await this.postSqlRepository.createPost(newPost);

    return postId;
  }
}
