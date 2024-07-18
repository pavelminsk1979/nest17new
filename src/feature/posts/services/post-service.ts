import { Injectable } from '@nestjs/common';
import { BlogDocument } from '../../blogs/domains/domain-blog';
import { Post, PostDocument } from '../domains/domain-post';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostRepository } from '../repositories/post-repository';
import { CreatePostInputModel } from '../api/pipes/create-post-input-model';
import { UpdatePostInputModel } from '../api/pipes/update-post-input-model';
import { LikeStatus } from '../../../common/types';
import { LikeStatusForPostRepository } from '../../like-status-for-post/repositories/like-status-for-post-repository';
import {
  LikeStatusForPost,
  LikeStatusForPostDocument,
} from '../../like-status-for-post/domain/domain-like-status-for-post';
import { UsersRepository } from '../../users/repositories/user-repository';
import { BlogSqlRepository } from '../../blogs/repositories/blog-sql-repository';
import { CreatePost } from '../api/types/dto';
import { PostSqlRepository } from '../repositories/post-sql-repository';
import { UpdatePostForCorrectBlogInputModel } from '../api/pipes/update-post-for-correct-blog-input-model';

@Injectable()
/*@Injectable()-декоратор что данный клас
 инжектируемый--тобишь в него добавляются
 зависимости
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ  В ФАЙЛ app.module
 * providers: [AppService,UsersService]
 провайдер-это в том числе компонент котоый
 возможно внедрить как зависимость*/
export class PostService {
  constructor(
    protected postSqlRepository: PostSqlRepository,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    protected postRepository: PostRepository,
    protected likeStatusForPostRepository: LikeStatusForPostRepository,
    @InjectModel(LikeStatusForPost.name)
    protected likeStatusModelForPost: Model<LikeStatusForPostDocument>,
    protected usersRepository: UsersRepository,
    protected blogSqlRepository: BlogSqlRepository,
  ) {}

  async createPost(createPostInputModel: CreatePostInputModel) {
    const { content, shortDescription, title, blogId } = createPostInputModel;

    /* нужно получить документ блога из базы чтобы взять от него
поле blogName*/
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

  async updatePost(
    blogId: string,
    postId: string,
    updatePostInputModel: UpdatePostForCorrectBlogInputModel,
  ): Promise<boolean> {
    /*  проверить-- есть ли пост с данной айдишкой и
    чтоб он принадлежал блогу с данной айдишкой*/

    const post = await this.postSqlRepository.getPost(postId);

    if (!post) return false;

    if (blogId !== post.blogId) return false;

    return this.postSqlRepository.updatePost(postId, updatePostInputModel);
  }

  async deletePostById(postId: string) {
    return this.postRepository.deletePostById(postId);
  }

  async setLikestatusForPost(
    userId: string,
    postId: string,
    likeStatus: LikeStatus,
  ) {
    const userDocument = await this.usersRepository.getUserById(userId);
    /*для создания нового документа(newLikeStatusForPost) потребуется
  login  создателя--- этот login потребуется вдальнейшем когда буду 
   формировать view для отдачи на фронт */

    const login = userDocument!.login;

    /* проверка- существует ли в базе такой пост*/

    const postDocument = await this.postRepository.getPostById(postId);

    if (!postDocument) return null;

    /*    ищу в базе ЛайковДляПостов  один документ   по
             двум полям userData.userId и postId---*/

    const document: LikeStatusForPostDocument | null =
      await this.likeStatusForPostRepository.findDocumentByUserIdAndPostId(
        userId,
        postId,
      );

    if (!document) {
      /*Если документа  нет тогда надо cоздать
      новый документ и добавить в базу*/

      const newLikeStatusForPost: LikeStatusForPostDocument =
        new this.likeStatusModelForPost({
          userId,
          postId,
          likeStatus,
          login,
          addedAt: new Date().toISOString(),
        });

      return await this.likeStatusForPostRepository.save(newLikeStatusForPost);
    }

    /*Если документ есть тогда надо изменить
     statusLike в нем на приходящий и установить теперещнюю дату
      установки */

    document.likeStatus = likeStatus;

    document.addedAt = new Date().toISOString();

    return await this.likeStatusForPostRepository.save(document);
  }
}
