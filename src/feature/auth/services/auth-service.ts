import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginInputModel } from '../api/pipes/login-input-model';
import { UsersRepository } from '../../users/repositories/user-repository';
import { User, UserDocument } from '../../users/domains/domain-user';
import { HashPasswordService } from '../../../common/service/hash-password-service';
import { TokenJwtService } from '../../../common/service/token-jwt-service';
import { RegistrationInputModel } from '../api/pipes/registration-input-model';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as randomCode } from 'uuid';
import { add } from 'date-fns';
import { EmailSendService } from '../../../common/service/email-send-service';
import { RegistrationConfirmationInputModel } from '../api/pipes/registration-comfirmation-input-model';
import { NewPasswordInputModel } from '../api/pipes/new-password-input-model';
import {
  SecurityDevice,
  SecurityDeviceDocument,
} from '../../security-device/domains/domain-security-device';
import { SecurityDeviceRepository } from '../../security-device/repositories/security-device-repository';
import { Request } from 'express';
import { UsersSqlRepository } from '../../users/repositories/user-sql-repository';
import { CreateUser, CreateUserWithId } from '../../users/api/types/dto';
import { SecurityDeviceSqlRepository } from '../../security-device/repositories/security-device-sql-repository';

@Injectable()
export class AuthService {
  constructor(
    protected usersRepository: UsersRepository,
    protected hashPasswordService: HashPasswordService,
    protected tokenJwtService: TokenJwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    protected emailSendService: EmailSendService,
    @InjectModel(SecurityDevice.name)
    private securityDeviceModel: Model<SecurityDeviceDocument>,
    protected securityDeviceRepository: SecurityDeviceRepository,
    protected usersSqlRepository: UsersSqlRepository,
    protected securityDeviceSqlRepository: SecurityDeviceSqlRepository,
  ) {}

  async loginUser(loginInputModel: LoginInputModel, request: Request) {
    const { loginOrEmail, password } = loginInputModel;

    /*в базе должен быть документ
    с приходящим емайлом или логином */
    const user: CreateUserWithId | null =
      await this.usersSqlRepository.findUserByLoginOrEmail(loginOrEmail);

    if (!user) return null;

    /*когда USER В БАЗЕ СОЗДАН  тогда  ФЛАГ  FALSE и
     * отправилось письмо на емайл для подтверждения емайла
     * и если подтвердит тогда флаг isConfirmed  сменится на true
     * и только потом можно ЗАЛОГИНИТСЯ */
    if (user.isConfirmed === false) return null;

    const passwordHash = user.passwordHash;

    /* делаю проверку-- на основании этого ли  пароля
     был создан хэш который в данном документе находится */
    const isCorrectPassword = await this.hashPasswordService.checkPassword(
      password,
      passwordHash,
    );

    if (!isCorrectPassword) return null;

    /*--далее устанавливаю библиотеки для JwtToken
     ---создаю tokenJwtServise
     -- в env переменную положить секрет
      ACCESSTOKEN_SECRET='12secret'*/

    const userId = user.id;

    /* в токен айдишку юзера положу и в  также последней части токена
    айдишка будет и  плюс секрет- они закодированые будут
    и когда токен будет приходить на эндпоитнты - тогда айдишку из токена
    сравню с айдишкой из этогоже токена НО ИЗ ЗАКОДИРОВАНОЙ
     ЧАСТИ ИБО СЕКРЕТ ТОЛЬКО НА БЭКЕНДЕ --если они совпадают(айдишки)
     значит можно обращатся на данный эндпоинт и ответ на данный
     запрос надо отдавать на фронтенд
      ТАКЖЕ УСТАНАВЛИВАЕТСЯ ВРЕМЯ ПРОТУХАНИЯ ТОКЕНА и также проверяется
      одновременно с айдишкой-- протух токен или нет
      ---в базу данных accessToken  не помещаентся
      --в env файл помещаю СЕКРЕТ токена, можно еще время жизни*/
    const accessToken = await this.tokenJwtService.createAccessToken(userId);

    if (!accessToken) return null;

    /*  МУЛЬТИДЕВАЙСНОСТЬ
     один user может залогиниться на одном сайте
     из своего телефона и плюс со своего ноутбука
     -- логиниться будет одним и темже login and password
     И НА РАЗНЫЙ УСТРОЙСТВА ПРИДУТ РАЗНЫЕ ПАРЫ
     accessToken and refreshToken
     ------ в базе надо создать коллекцию security-device*/

    const deviceId = randomCode();

    const { refreshToken, issuedAtRefreshToken } =
      await this.tokenJwtService.createRefreshToken(deviceId);

    /*на каждый девайс в колекции отдельный документ
     КОГДА АКСЕССТОКЕН протухнет тогда у рефрешТокена из самого
     токена достану deviceId и issuedAtRefreshToken И В ЛУЧШЕМ
     СЛУЧАЕ НАЙДУ ОДИН ДОКУМЕНТ В КОЛЕКЦИИ , и если документ есть то
     создам новую пару Акцес и Рефреш Токенов
     ---userId  надо чтоб АксессТокен создавать ведь надо
     отдавать пару токенов на фронтенд*/

    const ip =
      (request.headers['x-forwarded-for'] as string) ||
      (request.socket.remoteAddress as string);

    /*ip,nameDevice--- эти две сущности понадобятся
     * потом-- а именно когда я на фронт буду отдавать
     * информацию о всех девайсах для одного юзера
     * get запрос на эндпоинт security/devices */

    const nameDevice = request.headers['user-agent'] || 'Some Device';

    const newSecurityDevice: SecurityDevice = {
      deviceId,
      issuedAtRefreshToken,
      userId,
      ip,
      nameDevice,
    };

    const securityDevice: CreateUserWithId =
      await this.securityDeviceSqlRepository.createNewSecurityDevice(
        newSecurityDevice,
      );

    if (!securityDevice) return null;

    return { accessToken, refreshToken };
  }

  async registrationUser(registrationInputModel: RegistrationInputModel) {
    debugger;
    const { password, login, email } = registrationInputModel;

    /*   login и email  должны быть уникальные--поискать
     их в базе и если такие есть в базе то вернуть
     на фронт ошибку */

    const isExistLogin = await this.usersSqlRepository.isExistLogin(login);

    if (isExistLogin) {
      throw new BadRequestException([
        {
          message: 'field login must be unique',
          field: 'login',
        },
      ]);
    }

    const isExistEmail = await this.usersSqlRepository.isExistEmail(email);
    if (isExistEmail) {
      throw new BadRequestException([
        {
          message: 'field email must be unique',
          field: 'email',
        },
      ]);
    }

    const passwordHash = await this.hashPasswordService.generateHash(password);

    const newUser: CreateUser = {
      login,
      passwordHash,
      email,
      createdAt: new Date().toISOString(),
      confirmationCode: randomCode(),
      isConfirmed: false,
      expirationDate: add(new Date(), { hours: 1, minutes: 2 }).toISOString(),
      /*
       expirationDate инициализируется значением, которое
       рассчитывается с использованием функции add из библиотеки date-fns (или подобной библиотеки для работы с датами)
       Функция add принимает два аргумента: дату и объект с настройками добавления времени. В данном случае, первый аргумент - это текущая дата, полученная с помощью new Date(), а второй аргумент - это объект с настройками { hours: 1, minutes: 2 }, который указывает, что нужно добавить 1 час и 2 минуты к текущей дате*/
    };

    const result: [] | null =
      await this.usersSqlRepository.createNewUser(newUser);

    /* после того как в базе данных сущность уже создана
 ответ фронту покачто не отправляю
   НАДО отправить письмо с кодом на емайл тому пользователю
   который регистрируется сейчас
 Н*/

    const code = newUser.confirmationCode;

    const letter: string = this.emailSendService.createLetterRegistration(code);

    /*лучше  обработать ошибку отправки письма*/
    try {
      await this.emailSendService.sendEmail(email, letter);
    } catch (error) {
      console.log(
        'letter was not sent to email: file auth-service.ts... method registrationUser' +
          error,
      );
    }

    return result;
  }

  async registrationConfirmation(
    registrationConfirmationInputModel: RegistrationConfirmationInputModel,
  ) {
    const { code } = registrationConfirmationInputModel;

    const user = await this.usersSqlRepository.findUserByCode(code);
    if (!user) return false;

    if (user.isConfirmed === 'true') return false;

    /*надо проверку даты сделать что еще не протухла*/

    const expirationDate = new Date(user.expirationDate);

    /*-далее получаю милисекунды даты которая в базе лежала */

    const expirationDateMilSek = expirationDate.getTime();

    /*далее текущую дату и также милисекунды получаю */

    const currentDateMilSek = Date.now();

    if (expirationDateMilSek < currentDateMilSek) {
      return false;
    }

    const isConfirmed = true;

    const id = user[0].id;

    const changeUser: boolean = await this.usersSqlRepository.changeUser(
      isConfirmed,
      id,
    );

    return changeUser;
  }

  async registrationEmailResending(email: string) {
    const user = await this.usersSqlRepository.findUserByLoginOrEmail(email);

    if (!user) return false;
    debugger;
    if (user.isConfirmed === true) return false;

    //новая дата протухания
    const newExpirationDate = add(new Date(), {
      hours: 1,
      minutes: 2,
    }).toISOString();

    //новый код подтверждения
    const newCode = randomCode();

    /*  айдишка чтоб найти в таблице запись и изменить 
      значения в двух колонках*/

    const id = user.id;

    const isChangeUser = await this.usersSqlRepository.findUserByIdAndCange(
      id,
      newCode,
      newExpirationDate,
    );

    if (!isChangeUser) return false;

    const letter: string =
      this.emailSendService.createLetterRegistrationResending(newCode);

    /*лучше  обработать ошибку отправки письма*/
    try {
      await this.emailSendService.sendEmail(email, letter);
    } catch (error) {
      console.log(
        'letter was not sent to email: file auth-service.ts... method registrationUser' +
          error,
      );
    }

    return isChangeUser;
  }

  /* Востановление пароля через подтверждение по
   электронной почте.*/
  async passwordRecovery(email: string) {
    const user = await this.usersRepository.findUserByEmail(email);

    if (!user) return false;

    const newCode = randomCode();

    const newExpirationDate = add(new Date(), {
      hours: 1,
      minutes: 2,
    }).toISOString();

    user.confirmationCode = newCode;

    user.expirationDate = newExpirationDate;

    const changeUser: UserDocument = await this.usersRepository.save(user);

    if (!changeUser) return false;

    const letter = this.emailSendService.createLetterRecoveryPassword(newCode);

    /*лучше  обработать ошибку отправки письма*/
    try {
      await this.emailSendService.sendEmail(email, letter);
    } catch (error) {
      console.log(
        'letter was not sent to email: file auth-service.ts... method passwordRecovery' +
          error,
      );
    }

    return true;
  }

  async newPassword(newPasswordInputModel: NewPasswordInputModel) {
    const { newPassword, recoveryCode } = newPasswordInputModel;
    debugger;
    const user = await this.usersRepository.findUserByCode(recoveryCode);

    if (!user) return false;

    const newPasswordHash =
      await this.hashPasswordService.generateHash(newPassword);

    user.passwordHash = newPasswordHash;

    const changeUser: UserDocument = await this.usersRepository.save(user);

    if (!changeUser) return false;

    return true;
  }

  async updateTokensForRequestRefreshToken(refreshToken: string) {
    const result = await this.tokenJwtService.checkRefreshToken(refreshToken);

    /*  из токена достал два значения и одновременно по двум этим значениям ищу в базе один документ ЕСЛИ ДОКУМЕНТ
    НАШОЛСЯ то новую дату создания РЕФРЕШТОКЕНА надо в
    найденый документ в базу записать
    и два новых токена создаю и отдаю на фронт  */

    if (!result) return null;

    const { deviceId, issuedAtRefreshToken } = result;

    const device = await this.securityDeviceRepository.findDeviceByIdAndDate(
      deviceId,
      issuedAtRefreshToken,
    );

    if (!device) return null;

    const userId = device.userId;

    const newAccessToken = await this.tokenJwtService.createAccessToken(userId);

    const newResultRefreshToken =
      await this.tokenJwtService.createRefreshToken(deviceId);

    const newIssuedAtRefreshToken = newResultRefreshToken.issuedAtRefreshToken;

    const newRefreshToken = newResultRefreshToken.refreshToken;

    /*в базу данных сохраняю-ИЗМЕНЯЮ ДАТУ СОЗДАНИЯ РЕФРЕШТОКЕНА
    ДЛЯ ДОКУМЕНТА С КОТОРЫМ УЖЕ РАБОТАЛ_КОТОРЫЙ УЖЕ СУЩЕСТВУЕТ
    В БАЗЕ ДАННЫХ*/

    device.issuedAtRefreshToken = newIssuedAtRefreshToken;

    const updateDevice: SecurityDeviceDocument =
      await this.securityDeviceRepository.save(device);

    if (!updateDevice) return null;

    return { newAccessToken, newRefreshToken };
  }

  async createViewModelForMeRequest(userId: string) {
    const user: UserDocument | null =
      await this.usersRepository.getUserById(userId);

    if (!user) return null;

    return {
      email: user.email,
      login: user.login,
      userId,
    };
  }
}
