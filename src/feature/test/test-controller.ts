import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';

import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('testing')
export class TestController {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('all-data')
  async deleteAllData() {
    await this.dataSource.query(`
    DELETE FROM public."likecomment"
    `);
    await this.dataSource.query(`
    DELETE FROM public."comment"
    `);
    await this.dataSource.query(`
    DELETE FROM public."securityDevice"
    `);
    await this.dataSource.query(`
    DELETE FROM public."user"
    `);
    await this.dataSource.query(`
    DELETE FROM public."post"
    `);
    await this.dataSource.query(`
    DELETE FROM public."blog"
    `);

    return;
  }
}
