import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryParamsInputModel } from '../../../common/pipes/query-params-input-model';
import { ViewUser } from '../api/types/views';
import { CreateUserWithId } from '../api/types/dto';

@Injectable()
export class UserQuerySqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async getUsers(queryParams: QueryParamsInputModel) {
    /*   в обьекте queryParams будут для каждого 
 поля уже установленые значения по дефолту
 согласно СВАГЕРУ---устанавливаются они 
 на входе в ПАЙПЕ -файл query-params-user-input-model.ts
*/

    const {
      sortBy,
      sortDirection,
      pageNumber,
      pageSize,
      searchLoginTerm,
      searchEmailTerm,
    } = queryParams;

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

    /*
    ПОСЛЕ  FROM public."user" u   должна ити
    команда   WHERE u.login ILIKE $1 OR u.email ILIKE $2
    ИНАЧЕ У МЕНЯ БЫЛА ОШИБКА ЕСЛИ ШЛА
    команда  ORDER BY



    WHERE u.login ILIKE $1 OR u.email ILIKE $2

      ---- из фронта передаются  символ или
  символы  -- например -
  -передается от фронта "Jo" для определенной колонки и
   если  есть записи в базе данных  и у этих записей
   у ДАННОЙ КОЛОКИ например существуют  "John",
 "Johanna" и "Jonathan", тогда эти  три записи будут
 выбраны и возвращены как результат запроса
 !!!НАДО ВКЛЮЧАТЬ УСЛОВИЕ О ТОМ ЧТО НЕВАЖНО БОЛЬШИЕ
 ИЛИ МАЛЕНЬКИЕ БУКВЫ ПРИХОДЯТ ОТ ФРОНТЕНДА
 -----И ДЛЯ ТАКОГО ПОИСКА ИСПОЛЬЗУЕТСЯ СИНТАКСИС
    WHERE u.login ILIKE $1
   - по колонке login
   --ILIKE  это оператор сравнения -этот оператор
   выполнит поиск БЕЗУЧЕТА РЕГИСТРА    и из записей из колонки  login  он найдет  те записи в которых
   имеется подстрока  $1   (ILIKE $1)  , значения-символы
   подстроки пришли от фронтенда и они в
   переменной  searchLoginTerm
   И чтоб параметр задать ИСПОЛЬЗОВАТЬ НАДО
    ИМЕННО ТАКОЙ СИНТАКСИС в масиве
   [`%${searchLoginTerm}%`]



    Сортировка данных,

    ORDER BY $3 ${sortDirection}

    ---coртировать по названию колонки order by
    в данном примере -- ORDER BY $3 по значению
    которое в переменной sortBy, по умолчанию это
    значение 'createdAt', но от фронта может другое прийти 
    ЗНАЧЕНИЯ ПО УМОЛЧАНИЯ В ФАЙЛЕ query-params-input-model.ts
    ---направление сортировки в переменной  sortDirection
   НЕполучилось  ПОЛОЖИТЬ В ПАРАМЕТР , мол ключевые слова 
    такие как ASC или DESC - нельзя в параметр( ? ) 
    - поэтому вот таки синтаксисом
    ORDER BY $3 ${sortDirection}



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

    /* добавили COLLATE "C" после ORDER BY ${sortBy}  - это
   бинарный (binary) тип сравнения, который сохраняет 
   регистр символов при сортировке.*/
    const result = await this.dataSource.query(
      `
   SELECT *
  FROM public."user" u
   WHERE u.login ILIKE $1 OR u.email ILIKE $2
  ORDER BY "${sortBy}" COLLATE "C" ${sortDirection}  
    LIMIT $3 OFFSET $4
 
  `,
      [`%${searchLoginTerm}%`, `%${searchEmailTerm}%`, pageSize, amountSkip],
    );

    /*
    далее перед отправкой на фронтенд отмамплю записи из
    базы данных и добавлю поля - приведу к тому виду
    который ожидает  фронтенд
*/

    const arrayUsers: ViewUser[] = result.map((user: CreateUserWithId) => {
      return this.createViewModelUser(user);
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
  FROM public."user" u
   WHERE u.login ILIKE $1 OR u.email ILIKE $2
 `,
      [`%${searchLoginTerm}%`, `%${searchEmailTerm}%`],
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
      items: arrayUsers,
    };
  }

  createViewModelUser(user: CreateUserWithId): ViewUser {
    return {
      id: user.id,
      login: user.login,
      email: user.email,
      createdAt: user.createdAt,
    };
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

    return {
      id: result[0].id,
      login: result[0].login,
      email: result[0].email,
      createdAt: result[0].createdAt,
    };
  }
}
