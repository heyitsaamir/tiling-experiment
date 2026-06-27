import { createContext, createSignal, For, onCleanup, onMount, Show, useContext, type Accessor } from 'solid-js'
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
    setSelectedNode: (node: NodeData) => void
    selectedNode: Accessor<NodeData | null>
}>({ selectedNode: null, setSelectedNode: () => { } })

function Node(props: { node: NodeData }) {
    const ctx = useContext(Ctx)
    const style = () => {
        const isSelected = ctx.selectedNode() === props.node;
        const borderSize = isSelected ? 3 : 1;
        const borderColor = isSelected ? "black" : "orange"
        return `width: 100%; height: 100%; border: ${borderSize}px solid ${borderColor};`
    }

    return (
        <div
            onClick={() => {
                ctx.setSelectedNode(props.node)
            }}
            style={style()}
        >
            {props.node.name} isSelected: {ctx.selectedNode() === props.node ? 'true' : 'false'}
        </div>
    )
}

function ParentNode(props: { node: ParentNodeData }) {
    return (
        <div
            style={`display: flex; flex-direction: ${props.node.split === 'h' ? 'row' : 'column'}; height: 100%; width: 100%; border: 1px solid red;`}
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
                const firstChild = target.children.at(0)
                if (firstChild.type === "node") {
                    return firstChild
                } else {
                    return traverse(firstChild, dir)
                }
            }
        }
    }
    return traverse(parent, dir)
}


function App() {
    const [tile, setTile] = createSignal<ParentNodeData | NodeData>({ type: 'node', name: '0', parent: null })
    const [selectedNode, setSelectedNode] = createSignal<NodeData | null>(null)
    const [tileCount, setTileCount] = createSignal(0)

    const onReset = () => {
        setTile({ type: 'node', name: '0', parent: null, r: null, l: null, d: null, u: null })
        setSelectedNode(null);
        setTileCount(0)
    }

    const onClick = (dir: 'r' | 'l' | 'u' | 'd') => {
        const existingTile = selectedNode()
        if (!existingTile) return;
        const newTile: NodeData = { type: 'node' as const, name: (tileCount() + 1).toString(), parent: null, }
        setTileCount(tileCount() + 1)
        setSelectedNode(newTile)

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
                setTile((prev) => ({ ...prev }))
            } else {
                setTile(newParent)
            }
        }

    }
    onMount(() => {
        const keyDownEvent = (event: KeyboardEvent) => {
            if (event.key.toLocaleLowerCase() === "r") {
                onReset()
                return;
            }
            console.log(event.key)
            const splitKey = {
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
                onClick(dir)
            }

            const handleTraversal = () => {
                if (!dir) {
                    return
                }
                const n = selectedNode()

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
        <Ctx.Provider value={{ selectedNode: selectedNode, setSelectedNode: setSelectedNode }}>
            <div onKeyDown={(ev) => {
                if (ev.key === "j") {
                    onClick("d")
                }
            }} style="display: flex; flex-direction: column; border: 1px solid red; height: 100%; width: 100%;">
                <div>
                    h/j/k/l for direction (or arrow keys);
                    Hold shift and then press direction for split;
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
