import { Injectable } from '@nestjs/common';
import { CreateBlogInputModel } from '../api/pipes/create-blog-input-model';
import { CommandHandler } from '@nestjs/cqrs';
import { BlogSqlRepository } from '../repositories/blog-sql-repository';

export class UpdateBlogCommand {
  constructor(
    public blogId: string,
    public updateBlogInputModel: CreateBlogInputModel,
  ) {}
}

@CommandHandler(UpdateBlogCommand)
@Injectable()
export class UpdateBlogService {
  constructor(protected blogSqlRepository: BlogSqlRepository) {}

  async execute(command: UpdateBlogCommand) {
    return this.blogSqlRepository.updateBlog(
      command.blogId,
      command.updateBlogInputModel,
    );
  }
}
