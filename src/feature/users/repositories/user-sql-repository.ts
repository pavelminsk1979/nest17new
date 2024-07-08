import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateUser } from '../../auth/api/types/dto';

@Injectable()
/*@Injectable()-декоратор что данный клас инжектируемый
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ UsersRepository В ФАЙЛ app.module
 * providers: [AppService,UsersService,UsersRepository]*/
export class UsersSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async createNewUser(newUser: CreateUser) {
    const result = await this.dataSource.query(
      `
    INSERT INTO public."user"(
login, "passwordHash", email, "createdAt", "confirmationCode", "isConfirmed", "expirationDate")
VALUES ($1,$2,$3,$4,$5,$6,$7);
    `,
      [
        newUser.login,
        newUser.passwordHash,
        newUser.email,
        newUser.createdAt,
        newUser.confirmationCode,
        newUser.isConfirmed,
        newUser.expirationDate,
      ],
    );
  }
}
