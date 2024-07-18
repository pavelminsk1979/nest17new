import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogSqlRepository } from '../repositories/blog-sql-repository';

/*sqrs конспект 1501*/
export class DeleteBlogByIdCommand {
  constructor(public blogId: string) {}
}

@CommandHandler(DeleteBlogByIdCommand)
@Injectable()
export class DeleteBlogByIdService
  implements ICommandHandler<DeleteBlogByIdCommand>
{
  constructor(protected blogSqlRepository: BlogSqlRepository) {}

  async execute(command: DeleteBlogByIdCommand): Promise<boolean | null> {
    return this.blogSqlRepository.deleteBlogById(command.blogId);
  }
}
