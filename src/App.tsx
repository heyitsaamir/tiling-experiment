import { createContext, createSignal, For, onCleanup, onMount, Show, useContext, type Accessor } from 'solid-js'
import './App.css'

/*
 *
 * Have a page
 * It has a toolbar at the top.
 * Toolbar has top/bottom/right/left
 * Hitting "" constructs a tile that takes up
 *
 */

type Children = ParentNodeData | NodeData

interface ParentNodeData {
    type: 'parent'
    children: Children[]
    split: 'h' | 'v'
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

    return (
        <div
            onClick={() => {
                ctx.setSelectedNode(props.node)
            }}
            style={`width: 100%; height: 100%; border: 1px solid ${ctx.selectedNode() === props.node ? 'white' : 'orange'};`}
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

function App() {
    const [tile, setTile] = createSignal<ParentNodeData | NodeData>({ type: 'node', name: '0', parent: null })
    const [selectedNode, setSelectedNode] = createSignal<NodeData | null>(null)
    const [tileCount, setTileCount] = createSignal(0)

    const onReset = () => {
        setTile({ type: 'node', name: '0', parent: null })
        setSelectedNode(null);
        setTileCount(0)
    }

    const onClick = (dir: 'r' | 'l' | 'u' | 'd') => {
        const existingTile = selectedNode()
        if (!existingTile) return;
        const newTile: NodeData = { type: 'node' as const, name: (tileCount() + 1).toString(), parent: null }
        setTileCount(tileCount() + 1)
        const currentParent = existingTile.parent;
        const splitType = ['r', 'l'].includes(dir) ? 'h' : 'v';
        const next = ['d', 'r'].includes(dir)
        if (currentParent?.split === splitType) {
            // if same, just add it 
            newTile.parent = currentParent
            const index = currentParent.children.indexOf(existingTile);
            const targetIndex = next ? index + 1 : index
            currentParent.children.splice(targetIndex, 0, newTile)
            setTile((prev) => ({ ...prev }))
        } else {
            const newParent: ParentNodeData = { type: 'parent' as const, children: next ? [existingTile, newTile] : [newTile, existingTile], split: splitType, }
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

        setSelectedNode(newTile)
    }
    onMount(() => {
        const keyDownEvent = (event: KeyboardEvent) => {
            if (event.key.toLocaleLowerCase() === "r") {
                onReset()
                return;
            }
            const splitKey = {
                "j": "d",
                "h": "l",
                "k": "u",
                "l": "r"
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
                // if you want to go left,
            }

            if (event.shiftKey) {
                handleSplit()
            }
        }
        window.addEventListener("keypress", keyDownEvent)
        onCleanup(() => {
            window.removeEventListener("keypress", keyDownEvent)
        })
    })
    return (
        <Ctx.Provider value={{ selectedNode: selectedNode, setSelectedNode: setSelectedNode }}>
            <div onKeyPress={(ev) => {
                if (ev.key === "j") {
                    onClick("d")
                }
            }} style="display: flex; flex-direction: column; border: 1px solid red; height: 100%; width: 100%;">
                <div>
                    <button onClick={[onClick, 'r']}>Right</button>
                    <button onClick={[onClick, 'u']}>Up</button>
                    <button onClick={[onClick, 'l']}>Left</button>
                    <button onClick={[onClick, 'd']}>Down</button>
                    <button onClick={onReset}>Reset</button>
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
