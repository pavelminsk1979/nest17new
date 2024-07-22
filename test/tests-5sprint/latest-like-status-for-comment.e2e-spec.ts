import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { applyAppSettings } from '../../src/settings/apply-app-settings';
import request from 'supertest';

/*
---создать юзера 




---залогинился  .. получаю accessToken

---создаю blog ,  создаю post для blog  // получаю postId

---- СОЗДАЮ COMMENT ДЛЯ КОРРЕКТНОГО POST ПО АЙДИЩКЕ
и предоставляю accessToken так как  это защищенный андпоинт

--- СОЗДАЮ ЛАЙКСТАТУС ДЛЯ КОНКРЕТНОГО КОМЕНТАРИЯ

*/

describe('tests for andpoint users', () => {
  let app;

  const loginPasswordBasic64 = 'YWRtaW46cXdlcnR5';

  const login1 = 'login1';

  const password1 = 'password1';

  const email1 = 'email1@ema.com';

  let idBlog1;

  let idPost;

  let accessToken;

  let commentId;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    applyAppSettings(app);

    await app.init();

    //для очистки базы данных
    await request(app.getHttpServer()).delete('/testing/all-data');
  });

  afterAll(async () => {
    await app.close();
  });

  it('create user', async () => {
    const res = await request(app.getHttpServer())
      .post('/sa/users')
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        login: login1,
        password: password1,
        email: email1,
      })
      .expect(201);

    //userId = res.body.id;

    // console.log(res.body);
  });

  it('login  user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        loginOrEmail: login1,
        password: password1,
      })
      .expect(200);

    /*    если я положу  refreshToken в куку -вот так
        response.cookie('refreshToken', result.refreshToken, {
       httpOnly: true,
       secure: true,
     });
       ......это значит он в заголовках
   
       свойство res.headers['set-cookie'] содержит
       массив строк, представляющих заголовки 'Set-Cookie',
         включая куку 'refreshToken'.*/

    const allCookies = res.headers['set-cookie'];

    //console.log(allCookies[0].split(';')[0]);

    //console.log(res.body);

    accessToken = res.body.accessToken;
  });

  it('create   blog', async () => {
    const res = await request(app.getHttpServer())
      .post('/sa/blogs')
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        name: 'name11',
        description: 'description11',
        websiteUrl: 'https://www.outue11.com/',
      })
      .expect(201);

    idBlog1 = res.body.id;

    //console.log(res.body);
  });

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog1}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePost1',
        shortDescription: 'shortDescriptionPost1',
        content: 'contentPost1',
      })
      .expect(201);

    //console.log(res.body);

    idPost = res.body.id;
  });

  it('create one commit for correct post ', async () => {
    //console.log(accessToken);
    //console.log(postId);
    const res = await request(app.getHttpServer())
      .post(`/posts/${idPost}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'contentForPost contentForPost contentForPost',
      })
      .expect(201);

    commentId = res.body.id;

    //console.log(res.body);
  });

  it('create two commit for correct post ', async () => {
    //console.log(accessToken);
    //console.log(postId);
    const res = await request(app.getHttpServer())
      .post(`/posts/${idPost}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '2content2ForPost2 content2ForPost2 contentForPost',
      })
      .expect(201);

    commentId = res.body.id;

    //console.log(res.body);
  });

  it('set likeStatus for correct commit', async () => {
    const res = await request(app.getHttpServer())
      .put(`/comments/${commentId}/like-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        likeStatus: 'Like',
      })
      .expect(204);
  });

  it('get all commits for correct post ', async () => {
    //console.log(accessToken);
    //console.log(postId);
    const res = await request(app.getHttpServer())
      .get(`/posts/${idPost}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)

      .expect(200);

    console.log(res.body);
    console.log(res.body.items[0]);
  });
});
