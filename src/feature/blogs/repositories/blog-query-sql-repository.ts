import { Injectable } from '@nestjs/common';

import { ViewBlog } from '../api/types/views';
import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CreateBlogWithId } from '../api/types/dto';

@Injectable()
export class BlogQuerySqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async getBlogs(queryParamsBlog: QueryParamsInputModel) {
    const { searchNameTerm, sortBy, sortDirection, pageNumber, pageSize } =
      queryParamsBlog;

    /*   НАДО УКАЗЫВАТЬ КОЛИЧЕСТВО ПРОПУЩЕНЫХ 
ЗАПИСЕЙ - чтобы получать следующие за ними

 ЗНАЧЕНИЯ ПО УМОЛЧАНИЯ В ФАЙЛЕ
 query-params-input-model.ts

pageNumber по умолчанию 1, тобишь 
мне надо первую страницу на фронтенд отдать
, и это будут первые 10 записей из таблицы

pageSize - размер  одной страницы, ПО УМОЛЧАНИЮ 10
ТОБИШЬ НАДО ПРОПУСКАТЬ НОЛЬ ЗАПИСЕЙ
(pageNumber - 1) * pageSize
*/

    const amountSkip = (pageNumber - 1) * pageSize;

    /*   ---- из фронта передаются  символ или
       символы ДЛЯ СОРТИРОВКИ ПО  НАЗВАНИЮ -имени  БЛОГА
        -- например -
       -передается от фронта "Jo"  и
       если  есть записи ИМЕНА БЛОГОВ
        в базе данных  и  эти ИМЕНА например
        "John",
         "Johanna" и "Jonathan", тогда эти  три БЛОГА  будут
       выбраны и возвращены как результат запроса
       !!!НАДО ВКЛЮЧАТЬ УСЛОВИЕ О ТОМ ЧТО НЕВАЖНО БОЛЬШИЕ
       ИЛИ МАЛЕНЬКИЕ БУКВЫ ПРИХОДЯТ ОТ ФРОНТЕНДА
       -----И ДЛЯ ТАКОГО УСЛОВИЯ  ИСПОЛЬЗУЕТСЯ ключевое
       слово   ILIKE

       --ILIKE  это оператор сравнения -этот оператор
       выполнит поиск БЕЗУЧЕТА РЕГИСТРА

        --(ILIKE $1)   это ему добавлю по какой подстроке
        поиск- сделать
        $1-- это параметр  и в него попадет то что в переменной
        searchNameTerm

       И чтоб параметр задать ИСПОЛЬЗОВАТЬ НАДО
       ИМЕННО ТАКОЙ СИНТАКСИС в масиве
         [`%${searchNameTerm}%`]

        .................
             Сортировка данных,

      ORDER BY "${sortBy}" COLLATE "C" ${sortDirection}

    ---coртировать по названию колонки
    это название колонки а переменной sortBy

    ----COLLATE "C"   будет делать выжным большие и малые буквы
    при сортировке

     ---направление сортировки в переменной  sortDirection


      ...........................
          ----Для вывода данных порциями используется
    два оператора:

     LIMIT $3 OFFSET $4

    -limit - для ограничения количества записей из таблицы
  которое количество я хочу в результате получить---это
  число в переменной pageSize - по умолчанию 10

  -offset -это сколько записей надо пропустить,
   это в переменной amountSkip   ....например если
  лимит в 10 записей и от фронтенда просят 2-ую страницу,
  значит надо пропустить (2-1)*10 =  10 записей


         */

    const result = await this.dataSource.query(
      `
   SELECT *
  FROM public."blog" b
   WHERE b.name ILIKE $1 
  ORDER BY "${sortBy}" COLLATE "C" ${sortDirection}  
    LIMIT $2 OFFSET $3
 
  `,
      [`%${searchNameTerm}%`, pageSize, amountSkip],
    );

    /*
  далее перед отправкой на фронтенд отмамплю записи из
  базы данных и добавлю поля - приведу к тому виду
  который ожидает  фронтенд
*/

    const arrayBlogs: ViewBlog[] = result.map((blog: CreateBlogWithId) => {
      return this.createViewModelBlog(blog);
    });

    /*  totalCount  это---
     ПРИ запросе к базе данных я делал втом числе 
     и фильтрацию- по символам которые с фронтенда 
     могли прити
     ....
     НАПОМНЮ
     -передается от фронта "Jo" для определенной колонки и
   если  есть записи в базе данных  и у этих записей
   у ДАННОЙ КОЛОКИ например существуют  "John",
    "Johanna" и "Jonathan", тогда эти  три записи будут
     выбраны и возвращены как результат запроса
     ......
     НАПОМНЮ Я В ЗАПРОСЕ ТОЛЬКО 10 (поумолчанию)
     записей просил 
 А таких записей в таблице может быть много, и надо 
 сделать запрос и узнать их количество и положить в переменную  totalCount
 */

    const totalCountQuery = await this.dataSource.query(
      `
  SELECT COUNT(*) AS value
  FROM public."blog" b
   WHERE b.name ILIKE $1 
 `,
      [`%${searchNameTerm}%`],
    );

    const totalCount = Number(totalCountQuery[0].value);

    /*
pagesCount это число
Вычисляется общее количество страниц путем деления общего количества документов на размер страницы (pageSize), и округление вверх с помощью функции Math.ceil.*/

    const pagesCount: number = Math.ceil(totalCount / pageSize);

    return {
      pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount,
      items: arrayBlogs,
    };
  }

  async getBlogById(blogId: string) {
    const result = await this.dataSource.query(
      `
 select *
from public."blog" u
where u.id = $1
    `,
      [blogId],
    );

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      name: result[0].name,
      description: result[0].description,
      websiteUrl: result[0].websiteUrl,
      createdAt: result[0].createdAt,
      isMembership: result[0].isMembership,
    };
  }

  createViewModelBlog(blog: CreateBlogWithId): ViewBlog {
    return {
      id: blog.id,
      name: blog.name,
      description: blog.description,
      websiteUrl: blog.websiteUrl,
      createdAt: blog.createdAt,
      isMembership: blog.isMembership,
    };
  }
}
