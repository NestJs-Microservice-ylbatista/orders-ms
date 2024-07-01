/* eslint-disable prettier/prettier */

import { OrderStatus } from "@prisma/client";


export const OrderStatusList = [
    OrderStatus.PENDING,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
]