import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateUser } from '../api/types/dto';

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
VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id;
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

    /*вернётся массив и в массиве одно значение
     это будет обьект, и у этого обьекта будет ключ id,
     или null если юзер не будет создан */
    if (!result) return null;
    return result[0].id;
  }

  async isExistLogin(login: string) {
    const result = await this.dataSource.query(
      `
    select *
from public."user" u
where u.login = $1
    `,
      [login],
    );

    if (result.length === 0) return null;

    return result;
  }

  async isExistEmail(email: string) {
    const result = await this.dataSource.query(
      `
    select *
from public."user" u
where u.email = $1
    `,
      [email],
    );

    if (result.length === 0) return null;

    return result;
  }

  async findUserByCode(code: string) {
    const result = await this.dataSource.query(
      `
    select *
from public."user" u
where u."confirmationCode" = $1
    `,
      [code],
    );

    if (result.length === 0) return null;

    return result;
  }

  async changeUser(isConfirmed: boolean, id: string) {
    const result = await this.dataSource.query(
      `
UPDATE public."user"
SET  "isConfirmed"=$1
WHERE id=$2;
    `,
      [isConfirmed, id],
    );
    /*    в result будет всегда массив и всегда первым
        элементом будет ПУСТОЙ МАССИВ, а вторым элементом
        или НОЛЬ(если ничего не изменилось) или число-сколько
        строк изменилось(в данном случае еденица будет вторым элементом масива )*/
    if (result[1] === 0) return false;
    return true;
  }

  async findUserByLoginOrEmail(loginOrEmail: string) {
    const result = await this.dataSource.query(
      `
select *
from public."user" u
where u.login = $1
or u.email = $1
    `,
      [loginOrEmail],
    );
    /*в result будет  массив --- если не найдет запись ,  
     тогда ПУСТОЙ МАССИВ,   если найдет запись
     тогда первым элементом в массиве будет обьект */
    if (result.length === 0) return null;
    return result[0];
  }

  async deleteUserById(userId: string) {
    const result = await this.dataSource.query(
      `
DELETE FROM public."user"
WHERE id=$1;
    `,
      [userId],
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

  async findUserByIdAndCange(
    id: string,
    newCode: string,
    newExpirationDate: string,
  ) {
    const result = await this.dataSource.query(
      `

UPDATE public."user"
SET  "confirmationCode"=$1, "expirationDate"=$2
from public."user" u
where u.id = $3
    `,
      [newCode, newExpirationDate, id],
    );
    /*    в result будет всегда массив и всегда первым
           элементом будет ПУСТОЙ МАССИВ, а вторым элементом
           или НОЛЬ(если ничего не изменилось) или число-сколько
           строк изменилось(в данном случае еденица будет
   вторым элементом масива )*/
    if (result[1] === 0) return false;
    return true;
  }

  async getUserById(userId: string) {
    const result = await this.dataSource.query(
      `
 select *
from public."user" u
where u.id = $1
    `,
      [userId],
    );

    if (result.length === 0) return null;

    return result[0];
  }
}
