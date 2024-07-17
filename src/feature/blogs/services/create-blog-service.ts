import { Injectable } from '@nestjs/common';
import { BlogRepository } from '../repositories/blog-repository';
import { CreateBlogInputModel } from '../api/pipes/create-blog-input-model';
import { CommandHandler } from '@nestjs/cqrs';
import { CreateBlog } from '../api/types/dto';
import { BlogSqlRepository } from '../repositories/blog-sql-repository';

export class CreateBlogCommand {
  constructor(public createBlogInputModel: CreateBlogInputModel) {}
}

@CommandHandler(CreateBlogCommand)
@Injectable()
export class CreateBlogService {
  constructor(
    protected blogSqlRepository: BlogSqlRepository,
    protected blogRepository: BlogRepository,
  ) {}

  async execute(command: CreateBlogCommand): Promise<string | null> {
    const { name, websiteUrl, description } = command.createBlogInputModel;

    const newBlog: CreateBlog = {
      name,
      description,
      websiteUrl,
      createdAt: new Date().toISOString(),
      isMembership: false,
    };

    const blogId: string | null =
      await this.blogSqlRepository.createNewBlog(newBlog);

    return blogId;
  }
}
