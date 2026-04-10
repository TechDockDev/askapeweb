'use client';

interface CouncilStageBarProps {
    currentStage: number; // 0 = not started, 1, 2, 3
    stageStatuses: { [key: number]: 'pending' | 'started' | 'completed' };
}

const stages = [
    { num: 1, label: 'First Opinions', icon: '💬', description: 'Models respond independently' },
    { num: 2, label: 'Peer Review', icon: '🔍', description: 'Models critique each other' },
    { num: 3, label: 'Council Verdict', icon: '⚖️', description: 'Chairman synthesizes answer' },
];

export default function CouncilStageBar({ currentStage, stageStatuses }: CouncilStageBarProps) {
    const getStageState = (num: number) => {
        const status = stageStatuses[num];
        if (status === 'completed') return 'completed';
        if (status === 'started') return 'active';
        return 'pending';
    };

    return (
        <div className="council-stage-bar">
            {stages.map((stage, idx) => {
                const state = getStageState(stage.num);
                return (
                    <div key={stage.num} className="council-stage-item">
                        <div className={`council-stage-node ${state}`}>
                            <div className="council-stage-icon">
                                {state === 'completed' ? '✅' : state === 'active' ? stage.icon : stage.icon}
                            </div>
                            <div className="council-stage-label">{stage.label}</div>
                            <div className="council-stage-desc">{stage.description}</div>
                        </div>
                        {idx < stages.length - 1 && (
                            <div className={`council-stage-connector ${state === 'completed' ? 'completed' : ''}`}>
                                <div className="council-stage-connector-line" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
