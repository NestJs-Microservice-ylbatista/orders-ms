/* eslint-disable prettier/prettier */
import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService');

  async onModuleInit() { //inicializacion de la conexion a db
    await this.$connect();
    this.logger.log('Database connected');
  }


  constructor(
    @Inject (NATS_SERVICE) private readonly natsClient:ClientProxy,
  ){
    super();
  }

  //**CREATE ORDER */
  async create(createOrderDto: CreateOrderDto) {
    try {
      //1 Confirmar ids de los productos
      const productIds = createOrderDto.items.map( item => item.productId );
      const products = await firstValueFrom(
        //llamar al ms-products para obtener los porductos por el array de ids
        this.natsClient.send({cmd: 'validate_products'}, productIds)
      );

      //2 Calculos de los valores
      const totalAmount = createOrderDto.items.reduce( ( acc, orderItem) => {
        const price = products.find(
          product => product.id === orderItem.productId,
        ).price;

        return price * orderItem.quantity;
      }, 0);
      // console.log({totalAmount, products});
      
      const totalItems = createOrderDto.items.reduce(( acc, orderItems ) => {
        return acc + orderItems.quantity;
      }, 0);

      //3 Crear transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map( (orderItem) => ({ //return implicito ({})
                price: products.find( product => product.id === orderItem.productId ).price,
                productId: orderItem.productId,
                quantity:  orderItem.quantity,
              }) )
            }
          }
        },

        include: {
          OrderItem:{
           select: {
            price: true,
            quantity: true,
            productId: true
           }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) =>({
          ...orderItem,
          name: products.find( product => product.id === orderItem.productId ).name,
        }) )
      }


    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs'
      })
    }

    
   
  }






  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    console.log(orderPaginationDto);
    

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }




  //**FIND ORDER BY ID */
  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        }
      }
    });

    if( !order ) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id: ${ id } not found`
      })
    }

    const productIds = order.OrderItem.map( orderItem => orderItem.productId );
    const products = await firstValueFrom(
      //llamar al ms-products para obtener los porductos por el array de ids
      this.natsClient.send({cmd: 'validate_products'}, productIds)
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map( orderItem => ({
        ...orderItem,
        name: products.find( product => product.id === orderItem.productId ).name,
      }))
    };
  }





  async changeStatus( changeOrderStatus: ChangeOrderStatusDto ) {
   
    const { id, status } = changeOrderStatus;

    const order = await this.findOne( id );
    if( order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status: status },
    })
  }

}
