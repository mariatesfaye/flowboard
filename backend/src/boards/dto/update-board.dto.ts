import { IsString, MinLength } from 'class-validator';

export class UpdateBoardDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
