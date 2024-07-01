/* eslint-disable prettier/prettier */
import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter  {
  
  catch(exception: RpcException, host: ArgumentsHost) {
    // console.log('paso por el Custom FIlter');
    // return throwError(() => exception.getError());
    const Ctx = host.switchToHttp();
    const response = Ctx.getResponse();

    const rpcError = exception.getError();
    // console.log('rpcError', rpcError);
    if( typeof rpcError === 'object' &&
      'status' in rpcError &&
      'message' in rpcError
      ) {
      const status = isNaN(+rpcError.status) ? 400 : +rpcError.status;
      return response.status( status ).json( rpcError );
    }

    response.status(400).json({
      status: 400,
      message: rpcError
    })
  
  }
}