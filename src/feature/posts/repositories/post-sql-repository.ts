import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreatePost } from '../api/types/dto';
import { UpdatePostForCorrectBlogInputModel } from '../api/pipes/update-post-for-correct-blog-input-model';

@Injectable()
export class PostSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async createPost(newPost: CreatePost) {
    const result = await this.dataSource.query(
      `
INSERT INTO public.post( title, "shortDescription", content, "blogId", "createdAt")
VALUES ($1,$2,$3,$4,$5)
RETURNING id;
    `,
      [
        newPost.title,
        newPost.shortDescription,
        newPost.content,
        newPost.blogId,
        newPost.createdAt,
      ],
    );
    /*вернётся массив и в массиве одно значение
     это будет обьект, и у этого обьекта будет ключ id,
     или null если юзер не будет создан */
    if (!result) return null;
    return result[0].id;
  }

  async updatePost(
    postId: string,
    updatePostInputModel: UpdatePostForCorrectBlogInputModel,
  ) {
    const result = await this.dataSource.query(
      `
    
    UPDATE public.post
SET  title=$1, "shortDescription"=$2, content=$3
WHERE id=$4;
    
    `,
      [
        updatePostInputModel.title,
        updatePostInputModel.shortDescription,
        updatePostInputModel.content,
        postId,
      ],
    );

    /*    в result будет всегда массив и всегда первым
   элементом будет ПУСТОЙ МАССИВ, а вторым элементом
   или НОЛЬ(если ничего не изменилось) или число-сколько
   строк изменилось(в данном случае еденица будет 
вторым элементом масива )*/
    if (result[1] === 0) return false;
    return true;
  }

  async getPost(postId: string) {
    const result = await this.dataSource.query(
      `
    
    select *
    from public.post p
    where p.id=$1
    `,
      [postId],
    );

    /*в result будет  массив --- если не найдет запись  
    тогда ПУСТОЙ МАССИВ,   если найдет запись
    тогда первым элементом в массиве будет обьект */

    if (result.length === 0) return null;

    return result[0];
  }
}
