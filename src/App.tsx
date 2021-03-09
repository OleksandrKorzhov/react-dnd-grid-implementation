import {debounce} from 'lodash';
import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {
    DndProvider,
    useDrag,
    useDrop,
} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';
import styled from 'styled-components';
import {
    DragItem,
    DragItemType,
    HandleItemsManipulationParams,
} from './types';

const COLUMNS_COUNT = 5;

const getDragItemPositionIndex = (item: DragItem): number => item.index;

const getDragSourceColumnIndex = (item: DragItem): number => {
    const itemIndex = getDragItemPositionIndex(item);

    return itemIndex < COLUMNS_COUNT ? itemIndex : itemIndex % COLUMNS_COUNT;
}

const getDragSourceRowIndex = (item: DragItem): number => Math.floor(getDragItemPositionIndex(item) / COLUMNS_COUNT);

const toOneBasedNumber = (zeroBasedNumber: number): number => zeroBasedNumber + 1;

const DragSourceView = styled.div<DragItem>((props) => ({
    backgroundColor: 'lightblue',
    borderRadius: 5,
    cursor: 'pointer',
    color: 'grey',
    textAlign: 'center',
    lineHeight: '70px',
    gridColumn: `grid-item ${toOneBasedNumber(getDragSourceColumnIndex(props))} / span 1`,

    '&:hover': {
        backgroundColor: 'lightgreen',
    },
}));

const VirtualDragSourceView = styled.div<DragItem>(props => ({
    backgroundColor: 'blue',
    opacity: 0.5,
    borderRadius: 5,
    textAlign: 'center',
    lineHeight: '70px',
    gridColumn: `grid-gutter-start ${toOneBasedNumber(getDragSourceColumnIndex(props))} / span 1`,
    gridRow: toOneBasedNumber(getDragSourceRowIndex(props)),
}));

const Grid = styled.div({
    display: 'grid',
    gridTemplateColumns: [
        '[grid-gutter-start] 5px [grid-gutter-end grid-item] 50px',
        '[grid-item-end grid-gutter-start] 5px [grid-gutter-end grid-item] 50px',
        '[grid-item-end grid-gutter-start] 5px [grid-gutter-end grid-item] 50px',
        '[grid-item-end grid-gutter-start] 5px [grid-gutter-end grid-item] 50px',
        '[grid-item-end grid-gutter-start] 5px [grid-gutter-end grid-item] 50px',
    ].join(' '),
    gridTemplateRows: 'repeat(3, 70px)',
    rowGap: '10px',
});

const DragSource = React.forwardRef<any, DragItem & { name: string; viewComponent: React.ComponentType<DragItem & React.RefAttributes<any>> }>(({
    name,
    viewComponent: View,
    ...viewProps
}, ref) => {
    const viewRef = useRef<HTMLDivElement>(null);

    const dragItem: DragItem = {
        index: getDragItemPositionIndex(viewProps),
    };
    const [{isDragging}, drag, dragPreview] = useDrag(() => ({
            type: DragItemType.GridItem,
            item: dragItem,
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        }),
        [dragItem],
    );

    // @TODO: check can we avoid this or not
    useImperativeHandle(ref, () => ({
        getNode: (): HTMLDivElement | null => viewRef.current,
    }));

    drag(viewRef);
    dragPreview(viewRef);

    return (
        <View ref={viewRef} {...viewProps}>
            {name}
        </View>
    );
});

const DropTarget: React.FC<DragItem & {
    name: string;
    onDrop: (value: { fromIndex: number; toIndex: number }) => void;
    onHover: (value: { fromIndex: number; toIndex: number }) => void;
} & Pick<React.ComponentProps<typeof DragSource>, 'viewComponent'>> = ({
    onDrop,
    onHover,
    viewComponent,
    ...dragSourceProps
}) => {
    const dragRef = useRef<{ getNode: () => HTMLDivElement | null }>(null);
    const [{}, drop] = useDrop(
        {
            accept: DragItemType.GridItem,
            drop: (droppedItem: DragItem) => {
                onDrop({
                    fromIndex: getDragItemPositionIndex(droppedItem),
                    toIndex: getDragItemPositionIndex(dragSourceProps),
                });
            },
            hover: (hoverWithItem: DragItem) => {
                onHover({
                    fromIndex: getDragItemPositionIndex(hoverWithItem),
                    toIndex: getDragItemPositionIndex(dragSourceProps),
                });
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        },
        [dragSourceProps.index],
    );

    useEffect(() => {
        if (dragRef.current) drop(dragRef.current.getNode());
    }, [drop]);

    return (
        <DragSource
            ref={dragRef}
            viewComponent={viewComponent}
            {...dragSourceProps}
        />
    );
};

export default function App() {
    const [items, setItems] = useState(() =>
        Array.from({length: 15}).map((_, index) => ({index, virtual: false})),
    );
    const [virtualItem, setVirtualItem] = useState<{index: number} | null>(null);

    const handleItemsManipulation = useCallback(debounce((params: HandleItemsManipulationParams): void => {
        console.log(params);

        switch (params.type) {
            case 'drop':
                setItems((items) => {
                    const itemsCopy = [...items];
                    const [fromItem] = itemsCopy.splice(params.fromIndex, 1);
                    itemsCopy.splice(params.toIndex, 0, fromItem);

                    return itemsCopy;
                });

                setVirtualItem(null);
                break;
            case 'hover':
                if (params.fromIndex === params.toIndex) return;
                if (virtualItem?.index === params.toIndex) return;

                setVirtualItem({index: params.toIndex});
                break;
        }
    }, 50, {maxWait: 100}), [virtualItem]);

    const handleItemsReorder = useCallback((params: Pick<HandleItemsManipulationParams, 'fromIndex' | 'toIndex'>) => {
        handleItemsManipulation({...params, type: 'drop'});
    }, [handleItemsManipulation]);

    const handleHover = useCallback((params: Pick<HandleItemsManipulationParams, 'fromIndex' | 'toIndex'>) => {
        handleItemsManipulation({...params, type: 'hover'});
    }, [handleItemsManipulation]);

    return (
        <DndProvider backend={HTML5Backend}>
            <Grid>
                {virtualItem && <VirtualDragSourceView index={virtualItem.index} />}
                {items.map(
                    (item, index) =>
                        <DropTarget
                            key={item.index}
                            index={index}
                            name={String(item.index)}
                            onDrop={handleItemsReorder}
                            onHover={handleHover}
                            viewComponent={DragSourceView}
                        />,
                )}
            </Grid>
        </DndProvider>
    );
}
