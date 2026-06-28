import { createContext, createSignal, For, onCleanup, onMount, Show, useContext, type Signal } from 'solid-js'
import './App.css'

type Children = ParentNodeData | NodeData

type Dir = 'u' | 'd' | 'r' | 'l'

interface ParentNodeData {
    type: 'parent'
    children: Children[]
    split: 'h' | 'v'
    parent: ParentNodeData | null;
}
interface NodeData {
    type: 'node'
    name: string
    parent: ParentNodeData | null;
}

const Ctx = createContext<{
    selectedNode: Signal<NodeData | null>;
    movableNode: Signal<NodeData | null>;
}>({ selectedNode: [] as unknown as Signal<NodeData | null>, movableNode: [] as unknown as Signal<NodeData | null> })

function Node(props: { node: NodeData }) {
    const ctx = useContext(Ctx)
    const [selectedNode, setSelectedNode] = ctx?.selectedNode
    const [movableNode] = ctx.movableNode
    const style = () => {
        const isSelected = selectedNode() === props.node;
        const isMovable = movableNode() === props.node;
        const borderSize = isSelected || isMovable ? 3 : 1;
        const background = isMovable ? "lightblue" : isSelected ? "lightsalmon" : ""
        const borderColor = isMovable ? 'blue' : isSelected ? "black" : "orange"
        return `display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; outline: ${borderSize}px solid ${borderColor}; background-color: ${background}`
    }

    return (
        <div
            onClick={() => {
                setSelectedNode(props.node)
            }}
            style={style()}
        >
            {props.node.name}
        </div>
    )
}

function ParentNode(props: { node: ParentNodeData }) {
    return (
        <div
            style={`display: flex; flex-direction: ${props.node.split === 'h' ? 'row' : 'column'}; height: 100%; width: 100%;`}
        >
            <For each={props.node.children}>
                {(child) => {
                    if (child.type === 'parent') {
                        return <ParentNode node={child} />
                    } else {
                        return <Node node={child} />
                    }
                }}
            </For>
        </div>
    )
}

function traverse(tree: NodeData | ParentNodeData | null, dir: Dir): NodeData | null {
    if (tree == null) return null;
    const parent = tree.parent;
    if (!parent) return null
    const isSameSplitAsDirection = (['r', 'l'].includes(dir) && parent.split === "h") || (['u', 'd'].includes(dir) && parent.split === "v");
    if (isSameSplitAsDirection) {
        const index = parent.children.indexOf(tree);
        const isNext = ['r', 'd'].includes(dir);
        const targetIndex = isNext ? index + 1 : index - 1;
        if (targetIndex >= 0 && targetIndex < parent.children.length) {
            const target = parent.children[targetIndex];
            if (target.type === "node") {
                return target
            } else {
                let firstChild = target.children.at(0)
                while (firstChild != null && firstChild.type !== 'node') {
                    firstChild = firstChild.children.at(0)
                }
                return firstChild ?? null
            }
        }
    }
    return traverse(parent, dir)
}

function remove(tree: NodeData) {
    // remove the node from the parent. If the parent only has this node, then merge it with its parent
    if (!tree.parent) throw new Error("No Parent!")
    const children = tree.parent.children;
    const index = children.indexOf(tree);
    children.splice(index, 1);

    if (children.length === 1) {
        // No point in keeping this parent. Let's move the node up
        const parentsParent = tree.parent.parent;
        if (parentsParent) {
            const parentsChildren = parentsParent.children;
            const index = parentsChildren.indexOf(tree.parent);
            parentsChildren[index] = children[0]
            children[0].parent = parentsParent
        }
    }
}


function App() {
    const [tile, setTile] = createSignal<ParentNodeData | NodeData>({ type: 'node', name: '0', parent: null })
    const [getSelectedNode, setSelectedNode] = createSignal<NodeData | null>(null)
    const [getMovableNode, setMovableNode] = createSignal<NodeData | null>(null)
    const [tileCount, setTileCount] = createSignal(0)

    const onReset = () => {
        setTile({ type: 'node', name: '0', parent: null, })
        setSelectedNode(null);
        setTileCount(0)
    }

    const rerender = (prev: Children) => {
        const newNode = { ...prev };
        if (newNode.type === "parent") {
            newNode.children.forEach(child => {
                child.parent = newNode
            })
        }
        return newNode
    }

    const onDelete = (inputNode?: NodeData): void => {
        const node = inputNode ?? getSelectedNode();
        if (!node) return;
        const parentDir = node.parent?.split;
        const isFirst = node.parent?.children.indexOf(node) === 0
        let dirToTry: Dir[]
        if (parentDir === "h") {
            dirToTry = ['l', 'r']
            if (isFirst) {
                dirToTry.reverse()
            }
            dirToTry.push('u', 'd')
        } else {
            dirToTry = ['u', 'd']
            if (isFirst) {
                dirToTry.reverse()
            }
            dirToTry.push('l', 'r')
        }

        let traversedNode: NodeData | null = null
        for (let i = 0; i < dirToTry.length; i++) {
            const dir = dirToTry[i];
            traversedNode = traverse(node, dir)
            if (traversedNode) break
        }
        if (!traversedNode) {
            console.error("Can't remove last node")
            return
        }
        remove(node)
        if (getMovableNode() === node) {
            setMovableNode(null)
        }
        setTile(rerender)
        setSelectedNode(traversedNode)
    }

    const onClick = (dir: 'r' | 'l' | 'u' | 'd') => {
        const existingTile = getSelectedNode()
        if (!existingTile) return;

        const movableNode = getMovableNode()
        if (movableNode == existingTile) {
            return;
        }
        if (movableNode) {
            // first delete teh movable node, before moving it
            onDelete(movableNode)
        }
        const newTile: NodeData = movableNode != null ? { ...movableNode, parent: null } : { type: 'node' as const, name: (tileCount() + 1).toString(), parent: null, }
        setTileCount(tileCount() + 1)
        setSelectedNode(newTile)
        if (movableNode) {
            setMovableNode(newTile)
        }

        const currentParent = existingTile.parent;
        const splitType = ['r', 'l'].includes(dir) ? 'h' : 'v';
        const next = ['d', 'r'].includes(dir)


        if (currentParent?.split === splitType) {
            // if same, just add it to the same container
            newTile.parent = currentParent
            const index = currentParent.children.indexOf(existingTile);
            const targetIndex = next ? index + 1 : index
            currentParent.children.splice(targetIndex, 0, newTile)
            setTile((prev) => ({ ...prev }))
        } else {
            console.log("Createing new parent")
            // otherwise, create a new container in the new flex-direction
            // then set the right parent etc
            const newParent: ParentNodeData = { type: 'parent' as const, children: next ? [existingTile, newTile] : [newTile, existingTile], split: splitType, parent: currentParent }
            existingTile.parent = newParent;
            newTile.parent = newParent
            if (currentParent) {
                // If there already is a current parent
                const existingChildren = currentParent.children;
                const index = currentParent.children.indexOf(existingTile);
                existingChildren[index] = newParent
                setTile(rerender)
            } else {
                setTile(newParent)
            }
        }

    }

    const onMove = () => {
        const selectedNode = getSelectedNode()
        if (!selectedNode) return;
        const movableNode = getMovableNode();

        if (movableNode === selectedNode) {
            setMovableNode(null)
            return;
        } else {
            setMovableNode(selectedNode)
        }

    }
    onMount(() => {
        const keyDownEvent = (event: KeyboardEvent) => {
            if (event.key.toLocaleLowerCase() === "r") {
                onReset()
                return;
            }
            if (event.key.toLocaleLowerCase() === "d") {
                onDelete()
                return;
            }
            if (event.key.toLocaleLowerCase() === " ") {
                onMove()
                event.preventDefault()
                return;
            }
            const splitKey: Record<string, Dir> = {
                "j": "d",
                "h": "l",
                "k": "u",
                "l": "r",
                "arrowleft": "l",
                "arrowup": "u",
                "arrowright": 'r',
                "arrowdown": 'd'
            } as const;
            const dir = splitKey[event.key.toLocaleLowerCase()]
            const handleSplit = () => {
                if (!dir) {
                    return
                }
                event.preventDefault()
                onClick(dir)
            }

            const handleTraversal = () => {
                if (!dir) {
                    return
                }
                event.preventDefault();
                const n = getSelectedNode()

                const nextNode = traverse(n, dir)
                if (nextNode) {
                    setSelectedNode(nextNode)
                }
            }

            if (event.shiftKey) {
                handleSplit()
            } else {
                handleTraversal()
            }
        }
        window.addEventListener("keydown", keyDownEvent)
        onCleanup(() => {
            window.removeEventListener("keydown", keyDownEvent)
        })
    })
    return (
        <Ctx.Provider value={{ selectedNode: [getSelectedNode, setSelectedNode], movableNode: [getMovableNode, setMovableNode] }}>
            <div style="display: flex; flex-direction: column; height: 100%; width: 100%;">
                <div>
                    h/j/k/l for direction (or arrow keys);
                    Hold shift and then press direction for new tile;
                    "d" for delete;
                    Space for toggling movable node, then Shift+Direction to move;
                    "r" for reset
                </div>
                <div style="display: flex; border: 1px solid blue; height: 100%; width: 100%;">
                    <Show when={tile()} keyed>
                        {(currentTile) =>
                            currentTile.type === 'parent' ? (
                                <ParentNode node={currentTile} />
                            ) : (
                                <Node node={currentTile} />
                            )
                        }
                    </Show>
                </div>
            </div>
        </Ctx.Provider>
    )
}

export default App
