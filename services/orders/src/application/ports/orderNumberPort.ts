export interface OrderNumberPort {
  reserve(projectId: string): Promise<number>;
}
