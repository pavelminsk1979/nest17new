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
VALUES ( $1,$2,$3,$4,$5)
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

  async findCommentById(commentId: string) {
    const result = await this.dataSource.query(
      `
    
    select *
    from public.comment com
    where com.id=$1
    `,
      [commentId],
    );

    /*в result будет  массив --- если не найдет запись
    тогда ПУСТОЙ МАССИВ,   если найдет запись
    тогда первым элементом в массиве будет обьект */

    if (result.length === 0) return null;

    return result[0];
  }

  async changeComment(idComment: string, newContent: string) {
    const result = await this.dataSource.query(
      `
    
    UPDATE public.comment
SET  content=$1
WHERE id=$2;
    
    `,
      [newContent, idComment],
    );

    /*    в result будет всегда массив и всегда первым
элементом будет ПУСТОЙ МАССИВ, а вторым элементом
или НОЛЬ(если ничего не изменилось) или число-сколько
строк изменилось(в данном случае еденица будет
вторым элементом масива )*/

    if (result[1] === 0) return false;

    return true;
  }

  async deleteCommentById(commentId: string) {
    /*  СПЕРВА НАДО УДАЛИТЬ
      ЗАПИСИ В ТАБЛИЦЕ likecomment  КОТОРЫЕ 
      КАСАЮТСЯ ЭТОГО КОМЕНТАРИЯ 
     !!! ИНАЧЕ ОШИБКА БУДЕТ */
    await this.dataSource.query(
      `
    DELETE FROM public.likecomment
    WHERE "commentId" = $1;
    `,
      [commentId],
    );

    // Удаление комментария
    const result = await this.dataSource.query(
      `
    DELETE FROM public.comment
     WHERE id=$1;
    
    `,
      [commentId],
    );

    /*    в result будет всегда массив с двумя элементами
 и всегда первым
     элементом будет ПУСТОЙ МАССИВ, а вторым элементом
     или НОЛЬ(если ничего не изменилось) или число-сколько
     строк изменилось(в данном случае еденица будет
вторым элементом масива )*/

    if (result[1] === 0) return false;
    return true;
  }
}
