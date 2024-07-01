/* eslint-disable prettier/prettier */

import { IsNumber, IsPositive } from "class-validator";


export class OrderItemDto {
    
    @IsNumber()
    @IsPositive()
    productId: number;

    @IsNumber()
    @IsPositive()
    quantity: number;


    @IsNumber()
    @IsPositive()
    price: number;



}