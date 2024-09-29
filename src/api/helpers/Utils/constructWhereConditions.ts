import { Like, FindOptionsWhere } from 'typeorm';

export const constructWhereConditions = (filters: { [key: string]: any } = {}): FindOptionsWhere<any> => {
  const whereConditions: { [key: string]: any } = {};

  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== '') {
      whereConditions[key] = Like(`%${value}%`);
    }
  });

  return whereConditions;
};