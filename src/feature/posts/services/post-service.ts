import { Injectable } from '@nestjs/common';
import { BlogDocument } from '../../blogs/domains/domain-blog';
import { Post, PostDocument } from '../domains/domain-post';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostRepository } from '../repositories/post-repository';
import { CreatePostInputModel } from '../api/pipes/create-post-input-model';
import { LikeStatus } from '../../../common/types';
import { LikeStatusForPostRepository } from '../../like-status-for-post/repositories/like-status-for-post-repository';
import {
  LikeStatusForPost,
  LikeStatusForPostDocument,
} from '../../like-status-for-post/domain/domain-like-status-for-post';
import { BlogSqlRepository } from '../../blogs/repositories/blog-sql-repository';
import { CreatePost } from '../api/types/dto';
import { PostSqlRepository } from '../repositories/post-sql-repository';
import { UpdatePostForCorrectBlogInputModel } from '../api/pipes/update-post-for-correct-blog-input-model';
import { UsersSqlRepository } from '../../users/repositories/user-sql-repository';
import { LikeStatusForPostWithId } from '../../like-status-for-post/types/dto';
import { LikeStatusForPostSqlRepository } from '../../like-status-for-post/repositories/like-status-for-post-sql-repository';

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
    protected blogSqlRepository: BlogSqlRepository,
    protected usersSqlRepository: UsersSqlRepository,
    protected likeStatusForPostSqlRepository: LikeStatusForPostSqlRepository,
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

  async deletePost(blogId: string, postId: string) {
    /*  проверить-- есть ли пост с данной айдишкой и
 чтоб он принадлежал блогу с данной айдишкой*/

    const post = await this.postSqlRepository.getPost(postId);

    if (!post) return false;

    if (blogId !== post.blogId) return false;

    return this.postSqlRepository.deletePost(postId);
  }

  async deletePostById(postId: string) {
    return this.postRepository.deletePostById(postId);
  }

  async setLikestatusForPost(
    userId: string,
    postId: string,
    likeStatus: LikeStatus,
  ) {
    const user = await this.usersSqlRepository.getUserById(userId);
    /*для создания нового документа(newLikeStatusForPost) потребуется
  login  создателя--- этот login потребуется вдальнейшем когда буду 
   формировать view для отдачи на фронт */

    const login = user!.login;

    /* проверка- существует ли в базе такой пост*/

    const post = await this.postSqlRepository.getPost(postId);

    if (!post) return false;

    /*    ищу в базе ЛайковДляПостов  один документ   по
             двум полям userData.userId и postId---*/

    const likePost: LikeStatusForPostWithId | null =
      await this.likeStatusForPostSqlRepository.findLikePostByUserIdAndPostId(
        userId,
        postId,
      );

    if (!likePost) {
      /*Если документа  нет тогда надо cоздать
      новый документ и добавить в базу*/

      const newLikePost: LikeStatusForPost = {
        userId,
        postId,
        likeStatus,
        login,
        addedAt: new Date().toISOString(),
      };

      return await this.likeStatusForPostSqlRepository.createLikePost(
        newLikePost,
      );
    }

    /*Если документ есть тогда надо изменить
     statusLike в нем на приходящий и установить теперещнюю дату
      установки */

    const currentlikeStatus = likeStatus;

    const currentAddedAt = new Date().toISOString();

    const idCurrentLikePost = likePost.id;

    return await this.likeStatusForPostSqlRepository.changeLikePost(
      idCurrentLikePost,
      currentlikeStatus,
      currentAddedAt,
    );
  }
}
