import { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
} from 'reactflow';
import type { Connection, Edge, Node, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';

import { useERStore } from '../../stores';
import { TableNode } from './TableNode';
import type { Table, Relation } from '../../types';

const nodeTypes = {
  tableNode: TableNode,
};

function EREditorInner() {
  const { tables, relations, moveTable, addRelation, selectTable } = useERStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // テーブルをReact Flowノードに変換
  const tableToNode = useCallback((table: Table): Node => ({
    id: table.id,
    type: 'tableNode',
    position: table.position,
    data: { table },
  }), []);

  // リレーションをReact Flowエッジに変換
  const relationToEdge = useCallback((relation: Relation): Edge => ({
    id: relation.id,
    source: relation.sourceTableId,
    target: relation.targetTableId,
    sourceHandle: relation.sourceColumnId,
    targetHandle: relation.targetColumnId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1' },
    label: relation.type === 'one-to-many' ? '1:N' : relation.type === 'one-to-one' ? '1:1' : 'N:M',
  }), []);

  const [nodes, setNodes] = useNodesState(tables.map(tableToNode));
  const [edges, setEdges] = useEdgesState(relations.map(relationToEdge));

  // ストアの変更を監視してノードとエッジを更新
  useEffect(() => {
    setNodes(tables.map(tableToNode));
  }, [tables, tableToNode, setNodes]);

  useEffect(() => {
    setEdges(relations.map(relationToEdge));
  }, [relations, relationToEdge, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // 位置変更をストアに反映
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          moveTable(change.id, change.position);
        }
      });
    },
    [setNodes, moveTable]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        addRelation({
          sourceTableId: connection.source,
          sourceColumnId: connection.sourceHandle,
          targetTableId: connection.target,
          targetColumnId: connection.targetHandle,
          type: 'one-to-many',
        });
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [addRelation, setEdges]
  );

  const onPaneClick = useCallback(() => {
    selectTable(null);
  }, [selectTable]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        className="bg-gray-50"
      >
        <Background color="#ddd" gap={15} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.data?.table?.color) return n.data.table.color;
            return '#6366f1';
          }}
          nodeColor={(n) => {
            if (n.data?.table?.color) return n.data.table.color;
            return '#fff';
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function EREditor() {
  return (
    <ReactFlowProvider>
      <EREditorInner />
    </ReactFlowProvider>
  );
}
