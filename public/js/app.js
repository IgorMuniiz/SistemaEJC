const { useState, useEffect, useRef } = React;

const equipeOptions = [
  'Sala',
  'Garçom',
  'Cozinha',
  'Cafezinho',
  'Tios de externa',
  'Liturgia interna',
  'Liturgia externa',
  'Secretaria',
  'Ordem e limpeza',
  'Apoio e acolhida',
  'Compras',
];

function GenericForm() {
  const path = window.location.pathname;
  const isEncontro = path === '/encontro';
  const initialEjcAtivo = typeof window !== 'undefined' && window.__EJC_ATIVO__
    ? String(window.__EJC_ATIVO__).trim()
    : '';

  const autocompleteByField = {
    nomeCompleto: 'name',
    comoQuerSerChamado: 'nickname',
    dataNascimento: 'bday',
    telefone: 'tel',
    cep: 'postal-code',
    bairro: 'address-level2',
    logradouro: 'street-address',
    email: 'email',
    instagram: 'username',
    nomeMae: 'name',
    nomePai: 'name',
    telefoneMae: 'tel',
    telefonePai: 'tel',
  };

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    cep: '',
    estadoCivil: '',
    nomeMae: '',
    telefoneMae: '',
    nomePai: '',
    telefonePai: '',
    paroquiaFrequenta: '',
    participaMovimentoIgreja: '',
    conhecidoInscricaoHoje: '',
    conhecidoFezEjc: '',
    inscricaoAnterior: '',
    instrumentoMusical: '',
    expectativaXixEjcCop: '',
    comoQuerSerChamado: '',
    genero: '',
    ejc: '',
    qualEjcPertence: '',
    logradouro: '',
    bairro: '',
    equipeServiu: [],
    equipeCoordenou: [],
    temVeiculoProprio: '',
    dataNascimento: '',
    telefone: '',
    intolerante: '',
    email: '',
    temRelacionamento: '',
    instagram: '',
    lgpdConsentimento: false,
    foto: null,
    observacoes: '',
  });
  const [tiosData, setTiosData] = useState({
    pessoa1: {
      nomeCompleto: '',
      comoQuerSerChamado: '',
      genero: '',
      ejc: '',
      qualEjcPertence: '',
      logradouro: '',
      bairro: '',
      equipeServiu: [],
      equipeCoordenou: [],
      temVeiculoProprio: '',
      dataNascimento: '',
      telefone: '',
      intolerante: '',
      email: '',
      temRelacionamento: '',
      instagram: '',
      lgpdConsentimento: false,
      foto: null,
      observacoes: '',
    },
    pessoa2: {
      nomeCompleto: '',
      comoQuerSerChamado: '',
      genero: '',
      ejc: '',
      qualEjcPertence: '',
      logradouro: '',
      bairro: '',
      equipeServiu: [],
      equipeCoordenou: [],
      temVeiculoProprio: '',
      dataNascimento: '',
      telefone: '',
      intolerante: '',
      email: '',
      temRelacionamento: '',
      instagram: '',
      lgpdConsentimento: false,
      foto: null,
      observacoes: '',
    },
  });
  const [tipo, setTipo] = useState(isEncontro ? 'jovens' : 'unico');
  const [tiosModo, setTiosModo] = useState('casal');
  const [tioComParceiro, setTioComParceiro] = useState('nao');
  const [tioParceiroId, setTioParceiroId] = useState('');
  const [tiosDisponiveis, setTiosDisponiveis] = useState([]);
  const [carregandoTiosDisponiveis, setCarregandoTiosDisponiveis] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [successLeaving, setSuccessLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ejcAtivo, setEjcAtivo] = useState(initialEjcAtivo);
  const formRef = useRef(null);

  const encontristaSteps = [
    {
      key: 'identidade',
      label: 'Identidade',
      description: 'Dados pessoais e contato inicial',
    },
    {
      key: 'contexto',
      label: 'Endereco',
      description: 'Onde voce vive e como facilitar o contato da equipe',
    },
    {
      key: 'familia',
      label: 'Familia e igreja',
      description: 'Rede de apoio e vivencia na comunidade',
    },
    {
      key: 'finalizacao',
      label: 'Finalizacao',
      description: 'Expectativas, foto e autorizacao',
    },
  ];

  const encontroJovensSteps = [
    {
      key: 'perfil',
      label: 'Perfil',
      description: 'Identidade basica para o encontro',
    },
    {
      key: 'trajetoria',
      label: 'Trajetoria',
      description: 'Historico no EJC e equipes de servico',
    },
    {
      key: 'contato',
      label: 'Contato',
      description: 'Endereco e meios para retorno da equipe',
    },
    {
      key: 'encerramento',
      label: 'Encerramento',
      description: 'Foto, observacoes e autorizacao final',
    },
  ];

  const tiosSteps = [
    {
      key: 'perfil',
      label: 'Perfil',
      description: 'Identidade de cada tio participante',
    },
    {
      key: 'trajetoria',
      label: 'Trajetoria',
      description: 'Vivencia no EJC e equipes de servico',
    },
    {
      key: 'contato',
      label: 'Contato',
      description: 'Localizacao, relacao com a equipe e apoio logistico',
    },
    {
      key: 'revisao',
      label: 'Revisao',
      description: 'Confira os dados finais antes de enviar',
    },
  ];

  const activeSteps = !isEncontro ? encontristaSteps : (tipo === 'tios' ? tiosSteps : encontroJovensSteps);
  const shouldUseStepper = Boolean(activeSteps);

  useEffect(() => {
    const fields = document.querySelectorAll('input[name], textarea[name], select[name]');
    fields.forEach((field) => {
      const fieldName = field.getAttribute('name');
      if (!fieldName) return;
      const autocomplete = autocompleteByField[fieldName];
      if (autocomplete && !field.getAttribute('autocomplete')) {
        field.setAttribute('autocomplete', autocomplete);
      }
    });
  });

  useEffect(() => {
    setCurrentStep(0);
  }, [isEncontro, tipo, tiosModo]);

  useEffect(() => {
    if (ejcAtivo) return;

    let cancelled = false;
    fetch('/api/encontro-ativo', { headers: { Accept: 'application/json' } })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json && json.success && json.ejcNome) {
          setEjcAtivo(String(json.ejcNome).trim());
        }
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [ejcAtivo]);

  useEffect(() => {
    if (!ejcAtivo) return;

    setFormData((prev) => (prev.ejc === ejcAtivo ? prev : { ...prev, ejc: ejcAtivo }));
    setTiosData((prev) => ({
      ...prev,
      pessoa1: prev.pessoa1.ejc === ejcAtivo ? prev.pessoa1 : { ...prev.pessoa1, ejc: ejcAtivo },
      pessoa2: prev.pessoa2.ejc === ejcAtivo ? prev.pessoa2 : { ...prev.pessoa2, ejc: ejcAtivo },
    }));
  }, [ejcAtivo]);

  useEffect(() => {
    if (!(isEncontro && tipo === 'tios' && tiosModo === 'solo' && tioComParceiro === 'sim')) {
      return;
    }

    let cancelled = false;
    setCarregandoTiosDisponiveis(true);

    fetch('/api/tios-disponiveis')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setTiosDisponiveis(Array.isArray(json.items) ? json.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setTiosDisponiveis([]);
      })
      .finally(() => {
        if (cancelled) return;
        setCarregandoTiosDisponiveis(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEncontro, tipo, tiosModo, tioComParceiro]);

  useEffect(() => {
    if (tiosModo === 'casal') {
      setTioComParceiro('nao');
      setTioParceiroId('');
    }
  }, [tiosModo]);

  const handleChange = (e) => {
    const { name, value, options, multiple, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (multiple) {
      const selectedValues = Array.from(options)
        .filter((opt) => opt.selected)
        .map((opt) => opt.value);
      setFormData((prev) => ({ ...prev, [name]: selectedValues }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e) => {
    setFormData((prev) => ({ ...prev, foto: e.target.files[0] }));
  };

  const handleTiosChange = (pessoa, e) => {
    const { name, value, options, multiple, type, checked } = e.target;
    if (type === 'checkbox') {
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: { ...prev[pessoa], [name]: checked },
      }));
      return;
    }
    if (multiple) {
      const selectedValues = Array.from(options)
        .filter((opt) => opt.selected)
        .map((opt) => opt.value);
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: { ...prev[pessoa], [name]: selectedValues },
      }));
      return;
    }
    setTiosData((prev) => ({
      ...prev,
      [pessoa]: { ...prev[pessoa], [name]: value },
    }));
  };

  const handleTiosFile = (pessoa, e) => {
    setTiosData((prev) => ({
      ...prev,
      [pessoa]: { ...prev[pessoa], foto: e.target.files[0] },
    }));
  };

  const toggleEquipeSelection = (pessoa, field, value, checked) => {
    if (pessoa) {
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: {
          ...prev[pessoa],
          [field]: checked
            ? (prev[pessoa][field].includes(value) ? prev[pessoa][field] : [...prev[pessoa][field], value])
            : prev[pessoa][field].filter((item) => item !== value),
        },
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? (prev[field].includes(value) ? prev[field] : [...prev[field], value])
        : prev[field].filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[INFO] Iniciando submissão do formulário');

    if (!ejcAtivo) {
      setErrors([{ msg: 'Nenhum encontro ativo foi criado ainda. Aguarde a abertura do proximo EJC.' }]);
      return;
    }

    setSubmitting(true);
    const timeoutId = setTimeout(() => {
      console.error('Requisição travou, desbloqueando interface...');
      setSubmitting(false);
      setErrors([{ msg: 'Requisição demorou muito. Tente novamente.' }]);
    }, 30000); // 30 segundos de timeout

    try {
      const endpoint = isEncontro ? '/encontro' : '/inscricao';

      if (isEncontro && tipo === 'tios') {
        const usaParceiroExistente = tiosModo === 'solo' && tioComParceiro === 'sim' && tioParceiroId;
        const tiosGrupoId = tiosModo === 'casal'
          ? `tios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          : '';
        const pessoas = tiosModo === 'casal' ? ['pessoa1', 'pessoa2'] : ['pessoa1'];
        const categoriaTios = (tiosModo === 'casal' || usaParceiroExistente) ? 'casal' : 'solo';

        if (tiosModo === 'solo' && tioComParceiro === 'sim' && !tioParceiroId) {
          setErrors([{ msg: 'Selecione o tio ou tia para formar o casal.' }]);
          return;
        }

        const submitTiosMember = async (pessoa) => {
          const data = new FormData();
          const dataToSend = tiosData[pessoa];
          Object.entries(dataToSend).forEach(([k, v]) => {
            if (Array.isArray(v)) {
              v.forEach((item) => data.append(k, item));
            } else if (v !== null && v !== '') {
              data.append(k, v);
            }
          });
          data.append('tipo', 'tios');
          data.set('ejc', ejcAtivo);
          data.append('tiosCategoria', categoriaTios);
          data.append('origemTios', 'true');
          if (tiosGrupoId) {
            data.append('tiosGrupoId', tiosGrupoId);
          }
          if (usaParceiroExistente) {
            data.append('tioParceiroId', tioParceiroId);
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            body: data,
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        };

        const results = await Promise.all(pessoas.map((pessoa) => submitTiosMember(pessoa)));
        if (results.every((item) => item.success)) {
          console.log('[INFO] Ambos tios enviados com sucesso');
          clearTimeout(timeoutId);
          setSuccess(true);
          console.log('Success setado para true');
        } else {
          const allErrors = results.flatMap((item) => item.errors || []);
          setErrors(allErrors.length > 0 ? allErrors : [{ msg: 'Erro inesperado' }]);
        }
      } else {
        // Para pessoa individual
        const data = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach((item) => data.append(k, item));
          } else if (v !== null && v !== '') {
            data.append(k, v);
          }
        });
        data.append('tipo', tipo);
        data.set('ejc', ejcAtivo);
        data.append('tiosCategoria', '');
        data.append('origemTios', 'false');
        data.append('tiosGrupoId', '');

        const res = await fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
          console.log('[INFO] Individual enviado com sucesso');
          clearTimeout(timeoutId);
          setSuccess(true);
          console.log('Success setado para true');
        } else {
          setErrors(json.errors || [{ msg: 'Erro inesperado' }]);
        }
      }
    } catch (err) {
      console.error('Erro:', err);
      setErrors([{ msg: 'Erro ao enviar: ' + err.message }]);
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  const validateCurrentStep = () => {
    if (!shouldUseStepper) return true;

    const formElement = formRef.current;
    if (!formElement) return true;

    const stepPanels = Array.from(formElement.querySelectorAll(`[data-step-panel="${currentStep}"]`));
    if (!stepPanels.length) return true;

    for (const stepPanel of stepPanels) {
      const requiredFields = Array.from(stepPanel.querySelectorAll('input[required], select[required], textarea[required]'));
      const validatedRadioGroups = new Set();

      for (const field of requiredFields) {
        if (field.type === 'radio') {
          if (validatedRadioGroups.has(field.name)) continue;
          validatedRadioGroups.add(field.name);
          const group = Array.from(stepPanel.querySelectorAll(`input[type="radio"][name="${field.name}"]`));
          if (!group.some((radio) => radio.checked)) {
            group[0].reportValidity();
            return false;
          }
          continue;
        }

        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
    }

    return true;
  };

  const changeStep = (nextStep) => {
    setCurrentStep(nextStep);
    window.requestAnimationFrame(() => {
      const shellTop = document.querySelector('.form-shell');
      if (shellTop) {
        shellTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) {
      setErrors([{ msg: 'Preencha os campos obrigatorios desta etapa antes de continuar.' }]);
      return;
    }

    setErrors([]);
    changeStep(Math.min(currentStep + 1, activeSteps.length - 1));
  };

  const handlePreviousStep = () => {
    setErrors([]);
    changeStep(Math.max(currentStep - 1, 0));
  };

  const renderEncontristaStepFields = ({ pessoa, data, handleCh, handleF }) => (
    <>
      <section className={`form-step-panel${currentStep === 0 ? ' is-active' : ''}`} data-step-panel="0" hidden={currentStep !== 0}>
        <div className="form-section-title">
          <i className="fas fa-user-circle"></i>
          Identidade e contato
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomeCompleto-${pessoa}`} className="form-label">
              Nome completo *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-user"></i>
              </span>
              <input type="text" className="form-control" id={`nomeCompleto-${pessoa}`} name="nomeCompleto" value={data.nomeCompleto} onChange={handleCh} required />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor={`comoQuerSerChamado-${pessoa}`} className="form-label">
              Como quer ser chamado *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-tag"></i>
              </span>
              <input type="text" className="form-control" id={`comoQuerSerChamado-${pessoa}`} name="comoQuerSerChamado" value={data.comoQuerSerChamado} onChange={handleCh} required />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`genero-${pessoa}`} className="form-label">
              Genero *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-venus-mars"></i>
              </span>
              <select className="form-control" id={`genero-${pessoa}`} name="genero" value={data.genero} onChange={handleCh} required>
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor={`dataNascimento-${pessoa}`} className="form-label">
              Data de nascimento *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-calendar-alt"></i>
              </span>
              <input type="date" className="form-control" id={`dataNascimento-${pessoa}`} name="dataNascimento" value={data.dataNascimento} onChange={handleCh} required />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`telefone-${pessoa}`} className="form-label">
              Telefone (com WhatsApp) *
            </label>
            <input type="tel" className="form-control" id={`telefone-${pessoa}`} name="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={handleCh} required />
          </div>

          <div className="mb-3">
            <label htmlFor={`instagram-${pessoa}`} className="form-label">
              Qual seu Instagram? *
            </label>
            <input type="text" className="form-control" id={`instagram-${pessoa}`} name="instagram" value={data.instagram} onChange={handleCh} required />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 1 ? ' is-active' : ''}`} data-step-panel="1" hidden={currentStep !== 1}>
        <div className="form-section-title">
          <i className="fas fa-location-dot"></i>
          Endereco e referencia
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`cep-${pessoa}`} className="form-label">
              CEP *
            </label>
            <input type="text" className="form-control" id={`cep-${pessoa}`} name="cep" value={data.cep} onChange={handleCh} required />
          </div>

          <div className="mb-3">
            <label htmlFor={`bairro-${pessoa}`} className="form-label">
              Bairro *
            </label>
            <input type="text" className="form-control" id={`bairro-${pessoa}`} name="bairro" value={data.bairro} onChange={handleCh} required />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`logradouro-${pessoa}`} className="form-label">
            Logradouro *
          </label>
          <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} placeholder="Rua, numero, complemento, bloco ou apartamento" required />
        </div>

        <div className="mb-3">
          <label className="form-label">
            Estado civil *
          </label>
          <div className="step-radio-grid">
            {['Solteiro (a)', 'Casado (a)', 'Divorciado (a)', 'Viuvo (a)', 'Noivo (a)', 'Amasiado (a) (Morando junto)'].map((opt) => (
              <div className="form-check step-choice" key={`${pessoa || 'unico'}-estado-${opt}`}>
                <input className="form-check-input" type="radio" id={`estadoCivil-${pessoa}-${opt}`} name="estadoCivil" value={opt} checked={data.estadoCivil === opt} onChange={handleCh} required />
                <label className="form-check-label" htmlFor={`estadoCivil-${pessoa}-${opt}`}>
                  {opt}
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-people-roof"></i>
          Familia e vivencia na igreja
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomeMae-${pessoa}`} className="form-label">Nome da Mae *</label>
            <input type="text" className="form-control" id={`nomeMae-${pessoa}`} name="nomeMae" value={data.nomeMae} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`telefoneMae-${pessoa}`} className="form-label">Telefone da Mae *</label>
            <input type="tel" className="form-control" id={`telefoneMae-${pessoa}`} name="telefoneMae" placeholder="(11) 99999-9999" value={data.telefoneMae} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomePai-${pessoa}`} className="form-label">Nome do Pai *</label>
            <input type="text" className="form-control" id={`nomePai-${pessoa}`} name="nomePai" value={data.nomePai} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`telefonePai-${pessoa}`} className="form-label">Telefone do Pai *</label>
            <input type="tel" className="form-control" id={`telefonePai-${pessoa}`} name="telefonePai" placeholder="(11) 99999-9999" value={data.telefonePai} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`paroquiaFrequenta-${pessoa}`} className="form-label">Qual paroquia frequenta? *</label>
            <input type="text" className="form-control" id={`paroquiaFrequenta-${pessoa}`} name="paroquiaFrequenta" value={data.paroquiaFrequenta} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`participaMovimentoIgreja-${pessoa}`} className="form-label">Participa de algum movimento da igreja? *</label>
            <input type="text" className="form-control" id={`participaMovimentoIgreja-${pessoa}`} name="participaMovimentoIgreja" value={data.participaMovimentoIgreja} onChange={handleCh} required />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 3 ? ' is-active' : ''}`} data-step-panel="3" hidden={currentStep !== 3}>
        <div className="form-section-title">
          <i className="fas fa-flag-checkered"></i>
          Finalizacao da inscricao
        </div>

        <div className="form-row">
          <div className="mb-3 final-question-col">
            <div className="final-question-box">
            <label htmlFor={`conhecidoInscricaoHoje-${pessoa}`} className="form-label">Tem algum conhecido fazendo a inscricao hoje? *</label>
            <input type="text" className="form-control final-question-input" id={`conhecidoInscricaoHoje-${pessoa}`} name="conhecidoInscricaoHoje" value={data.conhecidoInscricaoHoje} onChange={handleCh} placeholder="Ex: Nome do conhecido" required />
            <small className="final-question-hint">Se nao houver, informe Nao.</small>
            </div>
          </div>
          <div className="mb-3 final-question-col">
            <div className="final-question-box">
            <label htmlFor={`conhecidoFezEjc-${pessoa}`} className="form-label">Tem algum conhecido que ja fez EJC? *</label>
            <input type="text" className="form-control final-question-input" id={`conhecidoFezEjc-${pessoa}`} name="conhecidoFezEjc" value={data.conhecidoFezEjc} onChange={handleCh} placeholder="Ex: Nome de quem ja fez" required />
            <small className="final-question-hint">Ajuda a equipe na identificacao rapida.</small>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3 final-question-col">
            <div className="final-question-box">
            <label htmlFor={`inscricaoAnterior-${pessoa}`} className="form-label">Voce ja fez alguma inscricao antes? Se sim, qual EJC. *</label>
            <input type="text" className="form-control final-question-input" id={`inscricaoAnterior-${pessoa}`} name="inscricaoAnterior" value={data.inscricaoAnterior} onChange={handleCh} placeholder="Ex: EJC 2023 ou Nao" required />
            <small className="final-question-hint">Mantenha a resposta curta e objetiva.</small>
            </div>
          </div>
          <div className="mb-3 final-question-col">
            <div className="final-question-box">
            <label htmlFor={`instrumentoMusical-${pessoa}`} className="form-label">Toca algum instrumento musical ou canta? *</label>
            <input type="text" className="form-control final-question-input" id={`instrumentoMusical-${pessoa}`} name="instrumentoMusical" value={data.instrumentoMusical} onChange={handleCh} placeholder="Ex: Violao, canto, teclado ou Nao" required />
            <small className="final-question-hint">Informe a habilidade principal para apoio no encontro.</small>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`expectativaXixEjcCop-${pessoa}`} className="form-label">Qual sua expectativa para o XIX ECJ COP? E porque quer fazer o encontro? *</label>
          <textarea className="form-control" id={`expectativaXixEjcCop-${pessoa}`} name="expectativaXixEjcCop" value={data.expectativaXixEjcCop} onChange={handleCh} rows="3" required></textarea>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`intolerante-${pessoa}`} className="form-label">Intolerancia ou restricao alimentar</label>
            <input type="text" className="form-control" id={`intolerante-${pessoa}`} name="intolerante" value={data.intolerante} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`foto-${pessoa}`} className="form-label">Upload de foto (JPG ou PNG) *</label>
            <input className="form-control" type="file" id={`foto-${pessoa}`} name="foto" accept="image/png, image/jpeg" onChange={handleF} required />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`observacoes-${pessoa}`} className="form-label">Observacoes</label>
          <textarea className="form-control" id={`observacoes-${pessoa}`} name="observacoes" value={data.observacoes} onChange={handleCh} rows="3"></textarea>
        </div>

        {renderReviewSummary('Resumo da inscricao', [
          ['Nome', data.nomeCompleto],
          ['Telefone', data.telefone],
          ['Instagram', data.instagram],
          ['Paroquia', data.paroquiaFrequenta],
        ])}

        <div className="mb-3 form-check step-consent-box">
          <input className="form-check-input" type="checkbox" id={`lgpdConsentimento-${pessoa || 'unico'}`} name="lgpdConsentimento" checked={!!data.lgpdConsentimento} onChange={handleCh} required />
          <label className="form-check-label" htmlFor={`lgpdConsentimento-${pessoa || 'unico'}`}>
            Declaro que li e autorizo o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>
      </section>
    </>
  );

  const renderEncontroJovemStepFields = ({ pessoa, data, handleCh, handleF, isTios }) => (
    <>
      <section className={`form-step-panel${currentStep === 0 ? ' is-active' : ''}`} data-step-panel="0" hidden={currentStep !== 0}>
        <div className="form-section-title">
          <i className="fas fa-user-circle"></i>
          Perfil para o encontro
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomeCompleto-${pessoa}`} className="form-label">Nome completo *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-user"></i></span>
              <input type="text" className="form-control" id={`nomeCompleto-${pessoa}`} name="nomeCompleto" value={data.nomeCompleto} onChange={handleCh} required />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`comoQuerSerChamado-${pessoa}`} className="form-label">Como quer ser chamado *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-tag"></i></span>
              <input type="text" className="form-control" id={`comoQuerSerChamado-${pessoa}`} name="comoQuerSerChamado" value={data.comoQuerSerChamado} onChange={handleCh} required />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`genero-${pessoa}`} className="form-label">Genero *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-venus-mars"></i></span>
              <select className="form-control" id={`genero-${pessoa}`} name="genero" value={data.genero} onChange={handleCh} required>
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`dataNascimento-${pessoa}`} className="form-label">Data de nascimento *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-calendar-alt"></i></span>
              <input type="date" className="form-control" id={`dataNascimento-${pessoa}`} name="dataNascimento" value={data.dataNascimento} onChange={handleCh} required />
            </div>
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 1 ? ' is-active' : ''}`} data-step-panel="1" hidden={currentStep !== 1}>
        <div className="form-section-title">
          <i className="fas fa-cross"></i>
          Trajetoria no EJC
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`ejc-${pessoa}`} className="form-label">EJC *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-church"></i></span>
              <input type="text" className="form-control" id={`ejc-${pessoa}`} name="ejc" value={ejcAtivo || data.ejc} readOnly required />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`qualEjcPertence-${pessoa}`} className="form-label">A qual EJC pertence</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-users"></i></span>
              <input type="text" className="form-control" id={`qualEjcPertence-${pessoa}`} name="qualEjcPertence" value={data.qualEjcPertence} onChange={handleCh} />
            </div>
          </div>
        </div>

        {pessoa === 'pessoa1' && tiosModo === 'solo' && (
          <div className="form-row">
            <div className="mb-3">
              <label htmlFor="tioComParceiro" className="form-label">Tio(a) com a(o)?</label>
              <select
                className="form-control"
                id="tioComParceiro"
                value={tioComParceiro}
                onChange={(e) => {
                  setTioComParceiro(e.target.value);
                  if (e.target.value !== 'sim') {
                    setTioParceiroId('');
                  }
                }}
              >
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </div>

            {tioComParceiro === 'sim' && (
              <div className="mb-3">
                <label htmlFor="tioParceiroId" className="form-label">Vincular com qual tio/tia?</label>
                <select
                  className="form-control"
                  id="tioParceiroId"
                  value={tioParceiroId}
                  onChange={(e) => setTioParceiroId(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {tiosDisponiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nomeCompleto}{item.tioParceiroId ? ' • ja vinculado(a)' : ''}
                    </option>
                  ))}
                </select>
                <small className="form-text text-light d-block mt-2">
                  {carregandoTiosDisponiveis
                    ? 'Carregando tios cadastrados...'
                    : 'Esse vinculo faz o casal sair lado a lado no PDF das equipes e no quadrante.'}
                </small>
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <label htmlFor={`equipeServiu-${pessoa}`} className="form-label">Equipe que ja serviu</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-serviu-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeServiu-${pessoa}-${opt}`} name="equipeServiu" value={opt} checked={data.equipeServiu.includes(opt)} onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeServiu', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeServiu-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
          <small className="text-muted">Pode selecionar mais de uma opcao.</small>
        </div>

        <div className="mb-3">
          <label htmlFor={`equipeCoordenou-${pessoa}`} className="form-label">Equipe que ja coordenou</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-coordenou-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeCoordenou-${pessoa}-${opt}`} name="equipeCoordenou" value={opt} checked={data.equipeCoordenou.includes(opt)} onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeCoordenou', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeCoordenou-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
          <small className="text-muted">Pode selecionar mais de uma opcao.</small>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-address-book"></i>
          Contato e localizacao
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`logradouro-${pessoa}`} className="form-label">Logradouro *</label>
            <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`bairro-${pessoa}`} className="form-label">Bairro *</label>
            <input type="text" className="form-control" id={`bairro-${pessoa}`} name="bairro" value={data.bairro} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`telefone-${pessoa}`} className="form-label">Telefone *</label>
            <input type="tel" className="form-control" id={`telefone-${pessoa}`} name="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`email-${pessoa}`} className="form-label">Email *</label>
            <input type="email" className="form-control" id={`email-${pessoa}`} name="email" value={data.email} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`instagram-${pessoa}`} className="form-label">Instagram</label>
            <input type="text" className="form-control" id={`instagram-${pessoa}`} name="instagram" value={data.instagram} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`temRelacionamento-${pessoa}`} className="form-label">Tem relacionamento com algum encontreiro ou encontrista?</label>
            <input type="text" className="form-control" id={`temRelacionamento-${pessoa}`} name="temRelacionamento" value={data.temRelacionamento} onChange={handleCh} placeholder="Se sim, informe com quem" />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 3 ? ' is-active' : ''}`} data-step-panel="3" hidden={currentStep !== 3}>
        <div className="form-section-title">
          <i className="fas fa-camera-retro"></i>
          Finalizacao
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`intolerante-${pessoa}`} className="form-label">Intolerante a alguma comida</label>
            <input type="text" className="form-control" id={`intolerante-${pessoa}`} name="intolerante" value={data.intolerante} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`foto-${pessoa}`} className="form-label">Upload de foto (JPG ou PNG) *</label>
            <input className="form-control" type="file" id={`foto-${pessoa}`} name="foto" accept="image/png, image/jpeg" onChange={handleF} required />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`observacoes-${pessoa}`} className="form-label">Observacoes</label>
          <textarea className="form-control" id={`observacoes-${pessoa}`} name="observacoes" value={data.observacoes} onChange={handleCh} rows="3"></textarea>
        </div>

        {renderReviewSummary('Resumo do encontro', [
          ['Nome', data.nomeCompleto],
          ['EJC', data.ejc],
          ['Telefone', data.telefone],
          ['Email', data.email],
          ['Endereco', `${data.logradouro || ''}${data.logradouro && data.bairro ? ' - ' : ''}${data.bairro || ''}`],
        ])}

        <div className="mb-3 form-check step-consent-box">
          <input className="form-check-input" type="checkbox" id={`lgpdConsentimento-${pessoa || 'unico'}`} name="lgpdConsentimento" checked={!!data.lgpdConsentimento} onChange={handleCh} required />
          <label className="form-check-label" htmlFor={`lgpdConsentimento-${pessoa || 'unico'}`}>
            Declaro que li e autorizo o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>
      </section>
    </>
  );

  const renderReviewSummary = (title, rows) => (
    <div className="review-summary-card">
      <div className="review-summary-head">
        <i className="fas fa-list-check"></i>
        <strong>{title}</strong>
      </div>
      <div className="review-summary-grid">
        {rows.map(([label, value]) => (
          <div className="review-summary-item" key={label}>
            <span>{label}</span>
            <strong>{value && String(value).trim() !== '' ? value : 'Nao informado'}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTiosStepFields = ({ pessoa, data, handleCh, handleF }) => (
    <>
      <section className={`form-step-panel${currentStep === 0 ? ' is-active' : ''}`} data-step-panel="0" hidden={currentStep !== 0}>
        <div className="form-section-title">
          <i className="fas fa-user-circle"></i>
          Identidade do participante
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomeCompleto-${pessoa}`} className="form-label">Nome completo *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-user"></i></span>
              <input type="text" className="form-control" id={`nomeCompleto-${pessoa}`} name="nomeCompleto" value={data.nomeCompleto} onChange={handleCh} required />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`comoQuerSerChamado-${pessoa}`} className="form-label">Como quer ser chamado *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-tag"></i></span>
              <input type="text" className="form-control" id={`comoQuerSerChamado-${pessoa}`} name="comoQuerSerChamado" value={data.comoQuerSerChamado} onChange={handleCh} required />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`genero-${pessoa}`} className="form-label">Genero *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-venus-mars"></i></span>
              <select className="form-control" id={`genero-${pessoa}`} name="genero" value={data.genero} onChange={handleCh} required>
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`dataNascimento-${pessoa}`} className="form-label">Data de nascimento *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-calendar-alt"></i></span>
              <input type="date" className="form-control" id={`dataNascimento-${pessoa}`} name="dataNascimento" value={data.dataNascimento} onChange={handleCh} required />
            </div>
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 1 ? ' is-active' : ''}`} data-step-panel="1" hidden={currentStep !== 1}>
        <div className="form-section-title">
          <i className="fas fa-cross"></i>
          Trajetoria no EJC
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`ejc-${pessoa}`} className="form-label">EJC *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-church"></i></span>
              <input type="text" className="form-control" id={`ejc-${pessoa}`} name="ejc" value={ejcAtivo || data.ejc} readOnly required />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor={`qualEjcPertence-${pessoa}`} className="form-label">A qual EJC pertence</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-users"></i></span>
              <input type="text" className="form-control" id={`qualEjcPertence-${pessoa}`} name="qualEjcPertence" value={data.qualEjcPertence} onChange={handleCh} />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`equipeServiu-${pessoa}`} className="form-label">Equipe que ja serviu</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-serviu-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeServiu-${pessoa}-${opt}`} name="equipeServiu" value={opt} checked={data.equipeServiu.includes(opt)} onChange={(e) => toggleEquipeSelection(pessoa, 'equipeServiu', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeServiu-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`equipeCoordenou-${pessoa}`} className="form-label">Equipe que ja coordenou</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-coordenou-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeCoordenou-${pessoa}-${opt}`} name="equipeCoordenou" value={opt} checked={data.equipeCoordenou.includes(opt)} onChange={(e) => toggleEquipeSelection(pessoa, 'equipeCoordenou', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeCoordenou-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`temVeiculoProprio-${pessoa}`} className="form-label">Tem veiculo proprio?</label>
          <select className="form-control" id={`temVeiculoProprio-${pessoa}`} name="temVeiculoProprio" value={data.temVeiculoProprio} onChange={handleCh}>
            <option value="">Selecione</option>
            <option value="true">Sim</option>
            <option value="false">Nao</option>
          </select>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-address-book"></i>
          Contato e localizacao
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`logradouro-${pessoa}`} className="form-label">Logradouro *</label>
            <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`bairro-${pessoa}`} className="form-label">Bairro *</label>
            <input type="text" className="form-control" id={`bairro-${pessoa}`} name="bairro" value={data.bairro} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`telefone-${pessoa}`} className="form-label">Telefone *</label>
            <input type="tel" className="form-control" id={`telefone-${pessoa}`} name="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`email-${pessoa}`} className="form-label">Email *</label>
            <input type="email" className="form-control" id={`email-${pessoa}`} name="email" value={data.email} onChange={handleCh} required />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`instagram-${pessoa}`} className="form-label">Instagram</label>
            <input type="text" className="form-control" id={`instagram-${pessoa}`} name="instagram" value={data.instagram} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`temRelacionamento-${pessoa}`} className="form-label">Tem relacionamento com algum encontreiro ou encontrista?</label>
            <input type="text" className="form-control" id={`temRelacionamento-${pessoa}`} name="temRelacionamento" value={data.temRelacionamento} onChange={handleCh} placeholder="Se sim, informe com quem" />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`intolerante-${pessoa}`} className="form-label">Intolerante a alguma comida</label>
          <input type="text" className="form-control" id={`intolerante-${pessoa}`} name="intolerante" value={data.intolerante} onChange={handleCh} />
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 3 ? ' is-active' : ''}`} data-step-panel="3" hidden={currentStep !== 3}>
        <div className="form-section-title">
          <i className="fas fa-flag-checkered"></i>
          Revisao final
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`foto-${pessoa}`} className="form-label">Upload de foto (JPG ou PNG) *</label>
            <input className="form-control" type="file" id={`foto-${pessoa}`} name="foto" accept="image/png, image/jpeg" onChange={handleF} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`observacoes-${pessoa}`} className="form-label">Observacoes</label>
            <textarea className="form-control" id={`observacoes-${pessoa}`} name="observacoes" value={data.observacoes} onChange={handleCh} rows="3"></textarea>
          </div>
        </div>

        {renderReviewSummary(`Resumo ${pessoa === 'pessoa1' ? 'da pessoa 1' : 'da pessoa 2'}`, [
          ['Nome', data.nomeCompleto],
          ['EJC', data.ejc],
          ['Telefone', data.telefone],
          ['Email', data.email],
          ['Veiculo proprio', data.temVeiculoProprio === 'true' ? 'Sim' : data.temVeiculoProprio === 'false' ? 'Nao' : 'Nao informado'],
        ])}

        <div className="mb-3 form-check step-consent-box">
          <input className="form-check-input" type="checkbox" id={`lgpdConsentimento-${pessoa || 'unico'}`} name="lgpdConsentimento" checked={!!data.lgpdConsentimento} onChange={handleCh} required />
          <label className="form-check-label" htmlFor={`lgpdConsentimento-${pessoa || 'unico'}`}>
            Declaro que li e autorizo o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>
      </section>
    </>
  );

  if (success) {
    console.log('[INFO] Renderizando tela de sucesso');

    const successContent = isEncontro
      ? (tipo === 'tios'
          ? {
              title: 'Inscricao dos Tios Confirmada!',
              subtitle: tiosModo === 'casal' ? 'Cadastro de casal concluido com sucesso' : (tioComParceiro === 'sim' ? 'Cadastro com vinculo de casal concluido com sucesso' : 'Cadastro de tio solo concluido com sucesso'),
              description: 'Recebemos as informacoes e sua participacao no encontro foi registrada. Em breve voce recebera os proximos passos.',
              note: 'Dados dos tios validados e gravados no sistema',
            }
          : {
              title: 'Inscricao de Encontreiro Confirmada!',
              subtitle: 'Tudo certo com seu cadastro para o encontro',
              description: 'Seu envio foi concluido com sucesso. Agora nossa equipe seguira com a organizacao e retornara com orientacoes.',
              note: 'Cadastro de encontro registrado com sucesso',
            })
      : {
          title: 'Inscricao Confirmada!',
          subtitle: 'Obrigado por sua inscricao no EJC COP',
          description: 'Seus dados foram enviados com sucesso. Aguarde a confirmacao para as proximas etapas do evento.',
          note: 'Dados registrados no banco de dados',
        };

    return (
      <div className={`success-screen${successLeaving ? ' is-exiting' : ''}`} role="status" aria-live="polite">
        <img src="/images/tema.png" alt="tema" className="success-screen-bg" />

        <div className="success-card">
          <div className="success-icon" aria-hidden="true">
            <i className="fas fa-circle-check"></i>
          </div>

          <h1 className="success-title">{successContent.title}</h1>

          <p className="success-subtitle">{successContent.subtitle}</p>

          <p className="success-description">{successContent.description}</p>

          <div className="success-note">
            <i className="fas fa-database"></i>
            {successContent.note}
          </div>

          <button
            type="button"
            className="success-action"
            onClick={() => {
              if (successLeaving) return;
              setSuccessLeaving(true);
              const url = isEncontro ? '/encontro' : '/inscricao';
              window.setTimeout(() => {
                window.location.href = url;
              }, 320);
            }}
          >
            <i className="fas fa-plus-circle"></i>
            Fazer nova inscricao
          </button>
        </div>
      </div>
    );
  }

  const renderTiosFields = (pessoa) => {
    const isTios = isEncontro && tipo === 'tios';
    const data = isTios ? tiosData[pessoa] : formData;
    const handleCh = (e) => isTios ? handleTiosChange(pessoa, e) : handleChange(e);
    const handleF = (e) => isTios ? handleTiosFile(pessoa, e) : handleFile(e);

    if (!isEncontro) {
      return renderEncontristaStepFields({ pessoa, data, handleCh, handleF });
    }

    if (!isTios) {
      return renderEncontroJovemStepFields({ pessoa, data, handleCh, handleF, isTios });
    }

    return renderTiosStepFields({ pessoa, data, handleCh, handleF });
  };

  const getProgressState = () => {
    const fieldsToTrack = ['nomeCompleto', 'comoQuerSerChamado', 'genero', 'dataNascimento', 'telefone', 'email'];

    const countFilled = (data) => {
      let filled = fieldsToTrack.reduce((acc, field) => {
        const value = data[field];
        return acc + (value && String(value).trim() !== '' ? 1 : 0);
      }, 0);
      if (data.foto) filled += 1;
      if (data.lgpdConsentimento) filled += 1;
      return filled;
    };

    if (isEncontro && tipo === 'tios') {
      const pessoas = tiosModo === 'casal' ? ['pessoa1', 'pessoa2'] : ['pessoa1'];
      const total = pessoas.length * (fieldsToTrack.length + 2);
      const filled = pessoas.reduce((acc, pessoa) => acc + countFilled(tiosData[pessoa]), 0);
      const percent = Math.max(5, Math.min(100, Math.round((filled / total) * 100)));
      return {
        filled,
        total,
        percent,
        label: tiosModo === 'casal' ? 'Cadastro de casal' : (tioComParceiro === 'sim' ? 'Cadastro com vinculo de casal' : 'Cadastro de tio solo'),
      };
    }

    const total = fieldsToTrack.length + 2;
    const filled = countFilled(formData);
    const percent = Math.max(5, Math.min(100, Math.round((filled / total) * 100)));
    return {
      filled,
      total,
      percent,
      label: isEncontro ? 'Inscrição de encontro' : 'Inscrição de encontrista',
    };
  };

  const progress = getProgressState();
  const currentStepMeta = activeSteps ? activeSteps[currentStep] : null;

  return (
    <>
      {submitting && !success && (
        <div className="loader-overlay" role="status" aria-live="polite" aria-label="Enviando formulário">
          <div className="loader" aria-hidden="true"></div>
        </div>
      )}
      <header className="portal-header mb-4">
        <a href="/" className="portal-back-link" aria-label="Voltar para a página inicial">
          <i className="fas fa-arrow-left"></i>
          Voltar
        </a>
        <div className="portal-header-main text-center">
          <p className="portal-eyebrow">EJC COP Digital Experience</p>
          <h1 className="display-5 fw-bold">{isEncontro ? 'Inscrição para Encontro' : 'Inscrição EJC'}</h1>
          <p className="lead">{isEncontro ? 'Forneça as informações para participar do encontro.' : 'Preencha seus dados abaixo e junte-se ao evento.'}</p>
        </div>
        <div className="form-progress-shell" aria-label="Progresso do preenchimento">
          <div className="form-progress-head">
            <span>{progress.label}</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div className="form-progress-track" role="progressbar" aria-valuenow={progress.percent} aria-valuemin="0" aria-valuemax="100">
            <div className="form-progress-fill" style={{ width: `${progress.percent}%` }}></div>
          </div>
          <small>{progress.filled} de {progress.total} pontos essenciais preenchidos</small>
        </div>
      </header>
      <div className="container form-stage d-flex justify-content-center align-items-start" style={{minHeight: '60vh'}}>
        <div className="card shadow-lg w-100 form-card form-shell" style={{maxWidth: '760px'}}>
          <div className="card-body form-shell-body">
            <>
              {isEncontro && (
                <>
                  <h3 className="text-center mb-3 text-white">Tipo de inscrição</h3>
                  <div className="d-grid gap-2 d-md-flex justify-content-center mb-4">
                    <button
                      type="button"
                      className={`btn btn-lg tipo-btn ${tipo === 'jovens' ? 'btn-primary' : 'btn-outline-light'}`}
                      onClick={() => setTipo('jovens')}
                    >
                      <i className="fas fa-users me-2"></i>Jovens
                    </button>
                    <button
                      type="button"
                      className={`btn btn-lg tipo-btn ${tipo === 'tios' ? 'btn-primary' : 'btn-outline-light'}`}
                      onClick={() => setTipo('tios')}
                    >
                      <i className="fas fa-heart me-2"></i>Tios
                    </button>
                  </div>
                  {tipo === 'tios' && (
                    <div className="d-grid gap-2 d-md-flex justify-content-center mb-4">
                      <button
                        type="button"
                        className={`btn btn-sm ${tiosModo === 'casal' ? 'btn-primary' : 'btn-outline-light'}`}
                        onClick={() => setTiosModo('casal')}
                      >
                        Casal
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${tiosModo === 'solo' ? 'btn-primary' : 'btn-outline-light'}`}
                        onClick={() => setTiosModo('solo')}
                      >
                        Tio Solo
                      </button>
                    </div>
                  )}
                </>
              )}

              {shouldUseStepper && activeSteps && (
                <>
                  <div className="form-stepper" aria-label="Etapas do formulario">
                    {activeSteps.map((step, index) => {
                      const isCompleted = index < currentStep;
                      const isActive = index === currentStep;
                      return (
                        <button
                          key={step.key}
                          type="button"
                          className={`form-stepper-item${isActive ? ' is-active' : ''}${isCompleted ? ' is-complete' : ''}`}
                          onClick={() => {
                            if (index <= currentStep) {
                              changeStep(index);
                            }
                          }}
                          aria-current={isActive ? 'step' : undefined}
                        >
                          <span className="form-stepper-index">{index + 1}</span>
                          <span className="form-stepper-copy">
                            <strong>{step.label}</strong>
                            <small>{step.description}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="form-step-summary" role="status" aria-live="polite">
                    <span>Etapa {currentStep + 1} de {activeSteps.length}</span>
                    <strong>{currentStepMeta.label}</strong>
                    <p>{currentStepMeta.description}</p>
                  </div>
                </>
              )}

            <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" aria-busy={submitting ? 'true' : 'false'}>
              {errors.length > 0 && (
                <div className="alert alert-danger form-alert" role="alert">
                  <div className="form-alert-title">
                    <i className="fas fa-triangle-exclamation me-2"></i>
                    Verifique os campos abaixo
                  </div>
                  <ul>
                    {errors.map((e, i) => (
                      <li key={i}>{e.msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {isEncontro && tipo === 'tios' ? (
                <div className="row g-3">
                  {(tiosModo === 'casal' ? ['pessoa1', 'pessoa2'] : ['pessoa1']).map((pessoa, idx) => (
                    <div key={pessoa} className="col-12">
                      <div className="alert alert-info mb-3">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>{tiosModo === 'casal' ? `Dados da Pessoa ${idx + 1}` : 'Dados do Tio Solo'}</strong>
                      </div>
                      {renderTiosFields(pessoa)}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {renderTiosFields()}
                </>
              )}
              <div className={`form-actions-bar${shouldUseStepper ? ' is-stepped' : ''}`}>
                {shouldUseStepper && (
                  <button
                    type="button"
                    className="btn btn-outline-light form-nav-btn"
                    onClick={handlePreviousStep}
                    disabled={currentStep === 0 || submitting}
                  >
                    <i className="fas fa-arrow-left me-2"></i>Voltar etapa
                  </button>
                )}

                {shouldUseStepper && activeSteps && currentStep < activeSteps.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary form-nav-btn form-nav-btn-primary"
                    onClick={handleNextStep}
                    disabled={submitting}
                  >
                    Proxima etapa<i className="fas fa-arrow-right ms-2"></i>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary form-submit-btn"
                    disabled={
                      submitting ||
                      (isEncontro && tipo === 'tios' && (
                        !tiosData.pessoa1.nomeCompleto || !tiosData.pessoa1.email || !tiosData.pessoa1.foto ||
                        !tiosData.pessoa1.genero || !tiosData.pessoa1.comoQuerSerChamado ||
                        !tiosData.pessoa1.lgpdConsentimento ||
                        (tiosModo === 'casal' && (!tiosData.pessoa2.nomeCompleto || !tiosData.pessoa2.email || !tiosData.pessoa2.foto || !tiosData.pessoa2.genero || !tiosData.pessoa2.comoQuerSerChamado || !tiosData.pessoa2.lgpdConsentimento))
                      )) ||
                      (isEncontro && tipo !== 'tios' && (!formData.foto || !formData.genero || !formData.comoQuerSerChamado || !formData.lgpdConsentimento)) ||
                      (!isEncontro && !formData.lgpdConsentimento)
                    }
                  >
                    {submitting ? (
                      'Enviando...'
                    ) : (
                      <><i className="fas fa-paper-plane me-2"></i>{!isEncontro ? 'Finalizar inscricao' : 'Enviar inscrição'}</>
                    )}
                  </button>
                )}
              </div>
        </form>
            </>
          </div>
        </div>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<GenericForm />);
