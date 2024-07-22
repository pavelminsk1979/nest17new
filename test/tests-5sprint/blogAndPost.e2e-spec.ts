import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';
import { applyAppSettings } from '../../src/settings/apply-app-settings';

describe('tests for andpoint blogs', () => {
  let app;

  let idBlog;

  let idBlog1;

  let idBlogForUpdate;

  let idPost;

  const loginPasswordBasic64 = 'YWRtaW46cXdlcnR5';

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

  it('create   blog', async () => {
    const res = await request(app.getHttpServer())
      .post('/sa/blogs')
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        name: 'name12',
        description: 'description12',
        websiteUrl: 'https://www.outue12.com/',
      })
      .expect(201);

    //console.log(res.body.id);

    idBlog = res.body.id;
  });

  it('create   blog', async () => {
    const res = await request(app.getHttpServer())
      .post('/sa/blogs')
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        name: 'name13',
        description: 'description13',
        websiteUrl: 'https://www.outue13.com/',
      })
      .expect(201);

    //console.log(res.body);

    idBlogForUpdate = res.body.id;
  });

  it('update   blog by id', async () => {
    const res = await request(app.getHttpServer())
      .put(`/sa/blogs/${idBlogForUpdate}`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        name: 'nameUpdate',
        description: 'descripUpdate',
        websiteUrl: 'https://www.outueUpd.com/',
      })
      .expect(204);
    //console.log(res.body);
  });

  it('delete   blog by id', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/sa/blogs/${idBlogForUpdate}`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)

      .expect(204);
    //console.log(res.body);
  });

  it('get  blog by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/blogs/${idBlog}`)

      .expect(200);
    //console.log(res.body);
  });

  it('get all  blogs andpoint SaBlogs', async () => {
    const res = await request(app.getHttpServer())
      .get('/sa/blogs')

      .expect(200);
    //console.log(res.body);
  });

  it('get all  blogs andpoint Blogs ', async () => {
    const res = await request(app.getHttpServer())
      .get('/blogs')

      .expect(200);
    //console.log(res.body);
  });

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog}/posts`)
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

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePost12',
        shortDescription: 'shortDescriptionPost12',
        content: 'contentPost12',
        blogId: idBlog,
      })
      .expect(201);

    //console.log(res.body);
  });

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog1}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePost222',
        shortDescription: 'shortDescriptionPost222',
        content: 'contentPost222',
      })
      .expect(201);

    //console.log(res.body);
  });

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog1}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePost223',
        shortDescription: 'shortDescriptionPost223',
        content: 'contentPost223',
      })
      .expect(201);

    //console.log(res.body);
  });

  it('create post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/sa/blogs/${idBlog1}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePost224',
        shortDescription: 'shortDescriptionPost224',
        content: 'contentPost224',
      })
      .expect(201);

    //console.log(res.body);
  });

  it('update  post', async () => {
    const res = await request(app.getHttpServer())
      .put(`/sa/blogs/${idBlog}/posts/${idPost}`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)
      .send({
        title: 'titlePUpdate',
        shortDescription: 'shortDescripUpdate',
        content: 'contentPUpdate',
      })
      .expect(204);

    //console.log(res.body);
  });

  it('delete  post', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/sa/blogs/${idBlog}/posts/${idPost}`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)

      .expect(204);

    //console.log(res.body);
  });

  it('get all  posts', async () => {
    const res = await request(app.getHttpServer())
      .get('/posts')
      .set('Authorization', `Basic ${loginPasswordBasic64}`)

      .expect(200);

    //console.log(res.body);
  });

  it('get all  posts for correct blog', async () => {
    const res = await request(app.getHttpServer())
      .get(`/blogs/${idBlog1}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)

      .expect(200);

    //console.log(res.body);
  });

  it('get all  posts for correct blog', async () => {
    const res = await request(app.getHttpServer())
      .get(`/sa/blogs/${idBlog}/posts`)
      .set('Authorization', `Basic ${loginPasswordBasic64}`)

      .expect(200);

    //console.log(res.body);
  });
});
