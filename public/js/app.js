const { useState, useEffect } = React;

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
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [successLeaving, setSuccessLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    const timeoutId = setTimeout(() => {
      console.error('Requisição travou, desbloqueando interface...');
      setSubmitting(false);
      setErrors([{ msg: 'Requisição demorou muito. Tente novamente.' }]);
    }, 30000); // 30 segundos de timeout

    try {
      const endpoint = isEncontro ? '/encontro' : '/inscricao';

      if (isEncontro && tipo === 'tios') {
        const tiosGrupoId = tiosModo === 'casal'
          ? `tios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          : '';
        const pessoas = tiosModo === 'casal' ? ['pessoa1', 'pessoa2'] : ['pessoa1'];

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
          data.append('tiosCategoria', tiosModo === 'casal' ? 'casal' : 'solo');
          data.append('origemTios', 'true');
          if (tiosGrupoId) {
            data.append('tiosGrupoId', tiosGrupoId);
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

  if (success) {
    console.log('[INFO] Renderizando tela de sucesso');

    const successContent = isEncontro
      ? (tipo === 'tios'
          ? {
              title: 'Inscricao dos Tios Confirmada!',
              subtitle: tiosModo === 'casal' ? 'Cadastro de casal concluido com sucesso' : 'Cadastro de tio solo concluido com sucesso',
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

    return (
      <>
        {/* Seção: Informações Pessoais */}
        <div className="form-section-title">
          <i className="fas fa-user-circle"></i>
          Informações Pessoais
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
              <input
                type="text"
                className="form-control"
                id={`nomeCompleto-${pessoa}`}
                name="nomeCompleto"
                value={data.nomeCompleto}
                onChange={handleCh}
                required
              />
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
              <input
                type="text"
                className="form-control"
                id={`comoQuerSerChamado-${pessoa}`}
                name="comoQuerSerChamado"
                value={data.comoQuerSerChamado}
                onChange={handleCh}
                required
              />
            </div>
          </div>
        </div>
        
        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`genero-${pessoa}`} className="form-label">
              Gênero *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-venus-mars"></i>
              </span>
              <select
                className="form-control"
                id={`genero-${pessoa}`}
                name="genero"
                value={data.genero}
                onChange={handleCh}
                required
              >
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
              <input
                type="date"
                className="form-control"
                id={`dataNascimento-${pessoa}`}
                name="dataNascimento"
                value={data.dataNascimento}
                onChange={handleCh}
                required
              />
            </div>
          </div>
        </div>
        
        {/* Seção: EJC */}
        <div className="form-section-title">
          <i className="fas fa-cross"></i>
          Informações EJC
        </div>
        
        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`ejc-${pessoa}`} className="form-label">
              EJC *
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-church"></i>
              </span>
              <input
                type="text"
                className="form-control"
                id={`ejc-${pessoa}`}
                name="ejc"
                value={data.ejc}
                onChange={handleCh}
                required
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor={`qualEjcPertence-${pessoa}`} className="form-label">
              A qual EJC pertence
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-users"></i>
              </span>
              <input
                type="text"
                className="form-control"
                id={`qualEjcPertence-${pessoa}`}
                name="qualEjcPertence"
                value={data.qualEjcPertence}
                onChange={handleCh}
              />
            </div>
          </div>
        </div>
        
        {isEncontro ? (
          <>
            <div className="mb-3">
              <label htmlFor={`equipeServiu-${pessoa}`} className="form-label">
                Equipe que já serviu
              </label>
              <div className="equipe-options-grid d-flex flex-column gap-2">
                {equipeOptions.map((opt) => (
                  <div className="form-check" key={`${pessoa || 'unico'}-serviu-${opt}`}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`equipeServiu-${pessoa}-${opt}`}
                      name="equipeServiu"
                      value={opt}
                      checked={data.equipeServiu.includes(opt)}
                      onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeServiu', opt, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`equipeServiu-${pessoa}-${opt}`}>
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
              <small className="text-muted">Pode selecionar mais de uma opção.</small>
            </div>
            <div className="mb-3">
              <label htmlFor={`equipeCoordenou-${pessoa}`} className="form-label">
                Equipe que já coordenou
              </label>
              <div className="equipe-options-grid d-flex flex-column gap-2">
                {equipeOptions.map((opt) => (
                  <div className="form-check" key={`${pessoa || 'unico'}-coordenou-${opt}`}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`equipeCoordenou-${pessoa}-${opt}`}
                      name="equipeCoordenou"
                      value={opt}
                      checked={data.equipeCoordenou.includes(opt)}
                      onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeCoordenou', opt, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`equipeCoordenou-${pessoa}-${opt}`}>
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
              <small className="text-muted">Pode selecionar mais de uma opção.</small>
            </div>
            {isTios && (
              <div className="mb-3">
                <label htmlFor={`temVeiculoProprio-${pessoa}`} className="form-label">
                  Tem veículo próprio?
                </label>
                <select
                  className="form-control"
                  id={`temVeiculoProprio-${pessoa}`}
                  name="temVeiculoProprio"
                  value={data.temVeiculoProprio}
                  onChange={handleCh}
                >
                  <option value="">Selecione</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            )}
            <div className="mb-3">
              <label htmlFor={`logradouro-${pessoa}`} className="form-label">
                Logradouro *
              </label>
              <input
                type="text"
                className="form-control"
                id={`logradouro-${pessoa}`}
                name="logradouro"
                value={data.logradouro}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`bairro-${pessoa}`} className="form-label">
                Bairro *
              </label>
              <input
                type="text"
                className="form-control"
                id={`bairro-${pessoa}`}
                name="bairro"
                value={data.bairro}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`dataNascimento-${pessoa}`} className="form-label">
                Data de nascimento *
              </label>
              <input
                type="date"
                className="form-control"
                id={`dataNascimento-${pessoa}`}
                name="dataNascimento"
                value={data.dataNascimento}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`telefone-${pessoa}`} className="form-label">
                Telefone *
              </label>
              <input
                type="tel"
                className="form-control"
                id={`telefone-${pessoa}`}
                name="telefone"
                placeholder="(11) 99999-9999"
                value={data.telefone}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`intolerante-${pessoa}`} className="form-label">
                Intolerante a alguma comida
              </label>
              <input
                type="text"
                className="form-control"
                id={`intolerante-${pessoa}`}
                name="intolerante"
                value={data.intolerante}
                onChange={handleCh}
              />
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label htmlFor={`dataNascimento-${pessoa}`} className="form-label">
                Data de Nascimento *
              </label>
              <input
                type="date"
                className="form-control"
                id={`dataNascimento-${pessoa}`}
                name="dataNascimento"
                value={data.dataNascimento}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`telefone-${pessoa}`} className="form-label">
                Telefone (com WhatsApp) *
              </label>
              <input
                type="tel"
                className="form-control"
                id={`telefone-${pessoa}`}
                name="telefone"
                placeholder="(11) 99999-9999"
                value={data.telefone}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`cep-${pessoa}`} className="form-label">
                CEP *
              </label>
              <input
                type="text"
                className="form-control"
                id={`cep-${pessoa}`}
                name="cep"
                value={data.cep}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`bairro-${pessoa}`} className="form-label">
                Bairro *
              </label>
              <input
                type="text"
                className="form-control"
                id={`bairro-${pessoa}`}
                name="bairro"
                value={data.bairro}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`logradouro-${pessoa}`} className="form-label">
                Lougradoro *
              </label>
              <input
                type="text"
                className="form-control"
                id={`logradouro-${pessoa}`}
                name="logradouro"
                value={data.logradouro}
                onChange={handleCh}
                placeholder="Rua, Numero, Complemento (Casa A, B.../Bloco, Apartamento...)"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                Estado Civil *
              </label>
              <div className="d-flex flex-column gap-2">
                {['Solteiro (a)', 'Casado (a)', 'Divorciado (a)', 'Viuvo (a)', 'Noivo (a)', 'Amasiado (a) (Morando junto)'].map((opt) => (
                  <div className="form-check" key={`${pessoa || 'unico'}-estado-${opt}`}>
                    <input
                      className="form-check-input"
                      type="radio"
                      id={`estadoCivil-${pessoa}-${opt}`}
                      name="estadoCivil"
                      value={opt}
                      checked={data.estadoCivil === opt}
                      onChange={handleCh}
                      required
                    />
                    <label className="form-check-label" htmlFor={`estadoCivil-${pessoa}-${opt}`}>
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`nomeMae-${pessoa}`} className="form-label">
                Nome da Mae *
              </label>
              <input
                type="text"
                className="form-control"
                id={`nomeMae-${pessoa}`}
                name="nomeMae"
                value={data.nomeMae}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`telefoneMae-${pessoa}`} className="form-label">
                Telefone da Mae *
              </label>
              <input
                type="tel"
                className="form-control"
                id={`telefoneMae-${pessoa}`}
                name="telefoneMae"
                placeholder="(11) 99999-9999"
                value={data.telefoneMae}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`nomePai-${pessoa}`} className="form-label">
                Nome do Pai *
              </label>
              <input
                type="text"
                className="form-control"
                id={`nomePai-${pessoa}`}
                name="nomePai"
                value={data.nomePai}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`telefonePai-${pessoa}`} className="form-label">
                Telefone do Pai *
              </label>
              <input
                type="tel"
                className="form-control"
                id={`telefonePai-${pessoa}`}
                name="telefonePai"
                placeholder="(11) 99999-9999"
                value={data.telefonePai}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`paroquiaFrequenta-${pessoa}`} className="form-label">
                Qual Paroquia frequenta? *
              </label>
              <input
                type="text"
                className="form-control"
                id={`paroquiaFrequenta-${pessoa}`}
                name="paroquiaFrequenta"
                value={data.paroquiaFrequenta}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`participaMovimentoIgreja-${pessoa}`} className="form-label">
                Participa de algum movimento da igreja? *
              </label>
              <input
                type="text"
                className="form-control"
                id={`participaMovimentoIgreja-${pessoa}`}
                name="participaMovimentoIgreja"
                value={data.participaMovimentoIgreja}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`conhecidoInscricaoHoje-${pessoa}`} className="form-label">
                Tem algum conhecido fazendo a inscricao hoje? *
              </label>
              <input
                type="text"
                className="form-control"
                id={`conhecidoInscricaoHoje-${pessoa}`}
                name="conhecidoInscricaoHoje"
                value={data.conhecidoInscricaoHoje}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`conhecidoFezEjc-${pessoa}`} className="form-label">
                Tem algum conhecido que ja fez EJC? *
              </label>
              <input
                type="text"
                className="form-control"
                id={`conhecidoFezEjc-${pessoa}`}
                name="conhecidoFezEjc"
                value={data.conhecidoFezEjc}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`inscricaoAnterior-${pessoa}`} className="form-label">
                Voce ja fez alguma inscricao antes? Se sim, qual EJC. *
              </label>
              <input
                type="text"
                className="form-control"
                id={`inscricaoAnterior-${pessoa}`}
                name="inscricaoAnterior"
                value={data.inscricaoAnterior}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`instrumentoMusical-${pessoa}`} className="form-label">
                Toca algum instrumento musical ou canta? *
              </label>
              <input
                type="text"
                className="form-control"
                id={`instrumentoMusical-${pessoa}`}
                name="instrumentoMusical"
                value={data.instrumentoMusical}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`expectativaXixEjcCop-${pessoa}`} className="form-label">
                Qual sua expectativa para o XIX ECJ COP? E porque quer fazer o encontro? *
              </label>
              <textarea
                className="form-control"
                id={`expectativaXixEjcCop-${pessoa}`}
                name="expectativaXixEjcCop"
                value={data.expectativaXixEjcCop}
                onChange={handleCh}
                rows="3"
                required
              ></textarea>
            </div>
            <div className="mb-3">
              <label htmlFor={`intolerante-${pessoa}`} className="form-label">
                Intolerancia ou Restricao Alimentar
              </label>
              <input
                type="text"
                className="form-control"
                id={`intolerante-${pessoa}`}
                name="intolerante"
                value={data.intolerante}
                onChange={handleCh}
              />
            </div>
          </>
        )}
        {isEncontro ? (
          <>
            <div className="mb-3">
              <label htmlFor={`email-${pessoa}`} className="form-label">
                Email *
              </label>
              <input
                type="email"
                className="form-control"
                id={`email-${pessoa}`}
                name="email"
                value={data.email}
                onChange={handleCh}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`temRelacionamento-${pessoa}`} className="form-label">
                Tem relacionamento com algum encontreiro ou encontrista?
              </label>
              <input
                type="text"
                className="form-control"
                id={`temRelacionamento-${pessoa}`}
                name="temRelacionamento"
                value={data.temRelacionamento}
                onChange={handleCh}
                placeholder="Se sim, informe com quem"
              />
            </div>
            <div className="mb-3">
              <label htmlFor={`instagram-${pessoa}`} className="form-label">
                Instagram
              </label>
              <input
                type="text"
                className="form-control"
                id={`instagram-${pessoa}`}
                name="instagram"
                value={data.instagram}
                onChange={handleCh}
              />
            </div>
          </>
        ) : (
          <div className="mb-3">
            <label htmlFor={`instagram-${pessoa}`} className="form-label">
              Qual seu Instagram? *
            </label>
            <input
              type="text"
              className="form-control"
              id={`instagram-${pessoa}`}
              name="instagram"
              value={data.instagram}
              onChange={handleCh}
              required
            />
          </div>
        )}
        <div className="mb-3">
          <label htmlFor={`foto-${pessoa}`} className="form-label">
            Upload de foto (JPG ou PNG) *
          </label>
          <input
            className="form-control"
            type="file"
            id={`foto-${pessoa}`}
            name="foto"
            accept="image/png, image/jpeg"
            onChange={handleF}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor={`observacoes-${pessoa}`} className="form-label">
            Observações
          </label>
          <textarea
            className="form-control"
            id={`observacoes-${pessoa}`}
            name="observacoes"
            value={data.observacoes}
            onChange={handleCh}
            rows="3"
          ></textarea>
        </div>
        <div className="mb-3 form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id={`lgpdConsentimento-${pessoa || 'unico'}`}
            name="lgpdConsentimento"
            checked={!!data.lgpdConsentimento}
            onChange={handleCh}
            required
          />
          <label className="form-check-label" htmlFor={`lgpdConsentimento-${pessoa || 'unico'}`}>
            Declaro que li e autorizo o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>
      </>
    );
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
        label: tiosModo === 'casal' ? 'Cadastro de casal' : 'Cadastro de tio solo',
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

            <form onSubmit={handleSubmit} encType="multipart/form-data" aria-busy={submitting ? 'true' : 'false'}>
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
      <button
            type="submit"
            className="btn btn-primary w-100 mt-3"
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
              <><i className="fas fa-paper-plane me-2"></i>Enviar inscrição</>
            )}
          </button>
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
