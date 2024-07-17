import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { BlogSqlRepository } from '../../feature/blogs/repositories/blog-sql-repository';

@ValidatorConstraint({ async: true })
/*надо добалять в app.module.ts в provide
 BlogExistsConstraint*/
export class BlogExistsConstraint implements ValidatorConstraintInterface {
  constructor(private blogSqlRepository: BlogSqlRepository) {}

  async validate(blogId: string, args?: ValidationArguments) {
    //console.log(blogId);
    const blog = await this.blogSqlRepository.findBlog(blogId);

    return !!blog;
  }

  defaultMessage(args?: ValidationArguments) {
    return 'Blog does not exist';
  }
}
