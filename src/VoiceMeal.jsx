import React from 'react';
import {t} from './i18n.js';
import LocalMealAssistant from './LocalMealAssistant.jsx';

class LocalAssistantBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p className="voice-help" role="alert">{t('Não foi possível abrir o assistente local. Reabra o app para tentar novamente ou use o registro manual.')}</p>:this.props.children;}
}

// The history editor and the dedicated meal page share the same extraction,
// portion validation and dictation flow. Do not reintroduce a second parser.
export default function VoiceMeal(props){
  return <LocalAssistantBoundary><LocalMealAssistant {...props}/></LocalAssistantBoundary>;
}
