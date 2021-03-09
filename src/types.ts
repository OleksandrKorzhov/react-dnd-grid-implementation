export type DragItem = {
    index: number;
};

export enum DragItemType {
    GridItem = 'GridItem'
}

export type HandleItemsManipulationParams = {
    fromIndex: number;
    toIndex: number;
    type: 'drop' | 'hover';
};
