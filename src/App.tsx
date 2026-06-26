import { createContext, createSignal, For, Show, useContext, type Accessor } from 'solid-js'
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
    children: [Children, Children]
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

    const onClick = (dir: 'h' | 'v') => {
        const existingTile = selectedNode()
        if (!existingTile) return;
        const newTile: NodeData = { type: 'node' as const, name: (tileCount() + 1).toString(), parent: null }
        setTileCount(tileCount() + 1)
        const currentParent = existingTile.parent;
        const newParent: ParentNodeData = { type: 'parent' as const, children: [existingTile, newTile], split: dir }
        existingTile.parent = newParent;
        newTile.parent = newParent
        if (currentParent) {
            const existingChildren = currentParent.children;
            const index = existingChildren[0] === existingTile ? 0 : 1
            existingChildren[index] = newParent
            setTile((prev) => ({ ...prev }))
        } else {
            setTile(newParent)
        }
    }
    return (
        <Ctx.Provider value={{ selectedNode: selectedNode, setSelectedNode: setSelectedNode }}>
            <div style="display: flex; flex-direction: column; border: 1px solid red; height: 100%; width: 100%;">
                <div>
                    <button onClick={[onClick, 'v']}>Vertical</button>
                    <button onClick={[onClick, 'h']}>Horizontal</button>
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
