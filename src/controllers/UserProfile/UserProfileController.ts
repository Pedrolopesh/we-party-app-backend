import { ILoginExternalUserResponse } from "types/User";
import { HttpRequest, HttpResponse } from "../protocols";
import {
  requestCreateExternalUser,
  requestLoginExternalUser,
} from "../../middlewares/requestExternalService";
import {
  CreateUserProfileParams,
  IUserProfileController,
  IUserProfileRepository,
  IUserProfileSearchParams,
  LoginUserProfileParams,
  UserProfile,
} from "controllers/UserProfile/UserProfile";

export class UserProfileController implements IUserProfileController {
  constructor(private readonly userProfileRepository: IUserProfileRepository) {}

  async createUserProfile(
    httpRequest: HttpRequest<CreateUserProfileParams>
  ): Promise<HttpResponse<UserProfile>> {
    try {
      const { body } = httpRequest;

      if (!body) {
        return {
          status: 400,
          body: "Body is required",
        };
      }

      const { password, ...mongoBody } = body;

      const getUser = await this.userProfileRepository.findUserProfileByEmail(
        mongoBody.email
      );

      if (getUser) {
        return {
          status: 400,
          body: "User already exists",
        };
      }

      const userProfile = await this.userProfileRepository.createUserProfile(
        mongoBody
      );

      const createdSqlUser = await requestCreateExternalUser({
        ...body,
        password,
        mongoUserId: userProfile.id,
      });

      if (!createdSqlUser) {
        return {
          status: 400,
          body: "Body is required",
        };
      }

      await this.userProfileRepository.updateUserProfile(userProfile.id, {
        sqlUserId: createdSqlUser.userId,
      });

      const result: any = {
        ...userProfile,
        token: createdSqlUser.token,
        tokenExpiresAt: createdSqlUser.tokenExpiresAt,
      };

      return {
        status: 201,
        body: result,
      };
    } catch (error: any) {
      console.log("error", error);
      return {
        status: 500,
        body: error,
      };
    }
  }

  async loginUserProfile(
    httpRequest: HttpRequest<LoginUserProfileParams>
  ): Promise<HttpResponse<ILoginExternalUserResponse>> {
    const { body } = httpRequest;

    if (!body) {
      return {
        status: 400,
        body: "Body is required",
      };
    }

    const loginExternalUser = await requestLoginExternalUser({
      email: body.email,
      password: body.password,
    });

    if (loginExternalUser?.status !== 200) {
      return {
        status: loginExternalUser.status,
        body: loginExternalUser,
      };
    }

    return {
      status: 200,
      body: loginExternalUser,
    };
  }

  async deleteUserProfile(
    httpRequest: HttpRequest<{ id: string }>
  ): Promise<HttpResponse<UserProfile>> {
    // TO DO: Colocar validação dos campos que são enviados pela requisição (se estão no formato correto, se estão vazios como uma sanitização dos dados que estão sendo enviados)
    const { body } = httpRequest;

    if (!body) {
      return {
        status: 400,
        body: "body is required",
      };
    }

    if (!body?.id) {
      return {
        status: 400,
        body: "Id is required",
      };
    }

    console.log("deleteUserProfile");
    const userProfile = await this.userProfileRepository.deleteUserProfile(
      body?.id
    );

    if (!userProfile) {
      return {
        status: 404,
        body: "User not found",
      };
    }

    return {
      status: 200,
      body: userProfile,
    };
  }

  async getAllUserProfiles(
    _httpRequest: HttpRequest<IUserProfileSearchParams>
  ): Promise<HttpResponse<UserProfile[]>> {
    const userProfiles = await this.userProfileRepository.getAllUserProfiles();

    return {
      status: 200,
      body: userProfiles,
    };
  }
}