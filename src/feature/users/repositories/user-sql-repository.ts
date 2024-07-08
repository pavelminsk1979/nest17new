import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
/*@Injectable()-декоратор что данный клас инжектируемый
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ UsersRepository В ФАЙЛ app.module
 * providers: [AppService,UsersService,UsersRepository]*/
export class UsersSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}
}
