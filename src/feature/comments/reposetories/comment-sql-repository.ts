import { Injectable } from '@nestjs/common';
import { CreateComment } from '../api/types/dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
/*@Injectable()-декоратор что данный клас инжектируемый
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ  В ФАЙЛ app.module
 * providers: [AppService,UsersService,UsersRepository]*/
export class CommentSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async createComment(newComment: CreateComment) {
    const result = await this.dataSource.query(
      `
    
    INSERT INTO public.comment(
 content, "postId", "createdAt", "userId", "userLogin")
VALUES ( $1,$2,$3,$4,$5);
  RETURNING id;  
    `,
      [
        newComment.content,
        newComment.postId,
        newComment.createdAt,
        newComment.userId,
        newComment.userLogin,
      ],
    );

    /*вернётся массив и в массиве одно значение
   это будет обьект, и у этого обьекта будет ключ id,
   или null если юзер не будет создан */
    if (!result) return null;
    return result[0].id;
  }
}
