import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreatePost } from '../api/types/dto';

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
}
