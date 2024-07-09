import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UserQuerySqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

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

    return {
      id: result[0].id,
      login: result[0].login,
      email: result[0].email,
      createdAt: result[0].createdAt,
    };
  }
}
