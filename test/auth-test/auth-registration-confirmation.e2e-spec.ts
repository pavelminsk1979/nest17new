import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { applyAppSettings } from '../../src/settings/apply-app-settings';
import request from 'supertest';

describe('tests for andpoint auth/login', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    applyAppSettings(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /*  ДЛЯ ТЕСТА  НАДО 
  -- запустить тест РЕГИСТРАЦИИ
  -- потом ВЗЯТЬ ИЗ БАЗЫ ДАННЫХ
  confirmationCode
  "26e24b65-b7ce-410e-bb08-febe06e9674e"

  напомню что имеется время протухания поэтому
  надо сделать регистрацию и потом подтверждение с
  новым-свежим кодом*/
  it('registration-confirmation  user', async () => {
    await request(app.getHttpServer())
      .post('/auth/registration-confirmation')
      .send({
        code: 'c3f3956d-9988-4ce6-9a63-d2e63565a40f',
      })
      .expect(204);
  });

  /*  it(' login  user ', async () => {
      /!* эти значения установлены в файле
         auth-registration.e2e-spec.ts*!/
  
      const login1 = 'login111';
  
      const password1 = 'password1';
  
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          loginOrEmail: login1,
          password: password1,
        })
        .expect(200);
  
      //console.log(res.body);
    });*/
});
