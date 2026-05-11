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
  'Dirigente',
  'CGS',
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
    complementoReferencia: 'address-line2',
    email: 'email',
    instagram: 'username',
    nomeMae: 'name',
    nomePai: 'name',
    telefoneMae: 'tel',
    telefonePai: 'tel',
  };

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    comoQuerSerChamado: '',
    genero: '',
    dataNascimento: '',
    telefone: '',
    instagram: '',
    email: '',
    cep: '',
    complementoReferencia: '',
    comQuemReside: '',
    paisVivosContato: '',
    estadoCivil: '',
    nomeMae: '',
    telefoneMae: '',
    nomePai: '',
    telefonePai: '',
    possuiFilhos: 'nao',
    filhosDetalhes: '',
    grauEscolaridade: '',
    talentoHabilidadeArtistica: '',
    tamanhoCamisa: '',
    paroquiaFrequenta: '',
    participaMovimentoIgreja: '',
    religiosidadeAtual: '',
    conhecidoInscricaoHoje: '',
    conhecidoFezEjc: '',
    inscricaoAnterior: '',
    instrumentoMusical: '',
    quadroSaude: '',
    medicamentoControlado: '',
    expectativaXixEjcCop: '',
    ejc: '',
    qualEjcPertence: '',
    logradouro: '',
    bairro: '',
    equipeServiu: [],
    equipeCoordenou: [],
    temVeiculoProprio: '',
    intolerante: '',
    ehAlergico: 'nao',
    alergiaDescricao: '',
    temRelacionamento: '',
    disponibilidadeEncontro: false,
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
      ehAlergico: 'nao',
      alergiaDescricao: '',
      email: '',
      disponibilidadeEncontro: false,
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
      ehAlergico: 'nao',
      alergiaDescricao: '',
      email: '',
      disponibilidadeEncontro: false,
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
  const photoPreviewUrlsRef = useRef({});
  const [photoPreviewByPessoa, setPhotoPreviewByPessoa] = useState({
    unico: '',
    pessoa1: '',
    pessoa2: '',
  });
  const [photoProcessingByPessoa, setPhotoProcessingByPessoa] = useState({
    unico: false,
    pessoa1: false,
    pessoa2: false,
  });

  const redirectToSuccessPage = () => {
    const destino = isEncontro ? '/sucesso?origem=encontro' : '/sucesso?origem=inscricao';
    window.location.assign(destino);
  };

  const encontristaSteps = [
    {
      key: 'identidade',
      label: 'Identidade',
      description: 'Dados pessoais e contato inicial',
    },
    {
      key: 'contexto',
      label: 'Endereço',
      description: '',
    },
    {
      key: 'familia',
      label: 'Família e igreja',
      description: 'Rede de apoio e vivência na comunidade',
    },
    {
      key: 'finalizacao',
      label: 'Finalização',
      description: 'Expectativas, foto e autorização',
    },
  ];

  const encontroJovensSteps = [
    {
      key: 'perfil',
      label: 'Perfil',
      description: 'Identidade básica para o encontro',
    },
    {
      key: 'trajetoria',
      label: 'Trajetória',
      description: 'Histórico no EJC e equipes de serviço',
    },
    {
      key: 'contato',
      label: 'Contato',
      description: 'Endereço e meios para retorno',
    },
    {
      key: 'encerramento',
      label: 'Encerramento',
      description: 'Foto, observações e autorização final',
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
      label: 'Trajetória',
      description: 'Vivência no EJC e equipes de serviço',
    },
    {
      key: 'contato',
      label: 'Contato',
      description: 'Localização, relação com a equipe e apoio logístico',
    },
    {
      key: 'revisao',
      label: 'Revisão',
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

  useEffect(() => {
    return () => {
      Object.values(photoPreviewUrlsRef.current || {}).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      photoPreviewUrlsRef.current = {};
    };
  }, []);

  const getFieldValidationShell = (field) => {
    if (!field) return null;

    return field.closest('.upload-field-shell')
      || field.closest('.step-consent-box')
      || field.closest('.final-question-box')
      || field.closest('.form-check')
      || field.closest('.mb-3')
      || field.parentElement;
  };

  const clearFieldValidationState = (field) => {
    if (!field) return;

    field.classList.remove('is-invalid');
    field.removeAttribute('aria-invalid');

    const shell = getFieldValidationShell(field);
    if (shell) {
      shell.classList.remove('field-validation-error');
    }
  };

  const clearValidationState = (root = formRef.current) => {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    root.querySelectorAll('.is-invalid').forEach((field) => {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    });

    root.querySelectorAll('.field-validation-error').forEach((element) => {
      element.classList.remove('field-validation-error');
    });
  };

  const markFieldInvalid = (field) => {
    if (!field) return;

    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');

    const shell = getFieldValidationShell(field);
    if (shell) {
      shell.classList.add('field-validation-error');
    }
  };

  const getFieldLabel = (field, scope = formRef.current) => {
    if (!field) return 'campo obrigatório';

    const fieldId = String(field.id || '').trim();
    let label = null;

    if (scope && fieldId) {
      label = scope.querySelector(`label[for="${fieldId}"]`);
    }

    if (!label) {
      label = field.closest('.form-check')?.querySelector('.form-check-label') || null;
    }

    if (!label) {
      label = field.closest('.mb-3')?.querySelector('.form-label') || null;
    }

    const text = String(label?.textContent || field.name || 'campo obrigatório')
      .replace(/\s+/g, ' ')
      .replace(/\*/g, '')
      .trim();

    return text || 'campo obrigatório';
  };

  const getStepCandidateFields = (stepPanel) => {
    if (!stepPanel) return [];

    return Array.from(stepPanel.querySelectorAll('input[name], select[name], textarea[name]'))
      .filter((field) => !field.disabled)
      .filter((field) => field.required || isEssentialRequiredField(field));
  };

  const buildValidationMessage = (field, label) => {
    if (field.type === 'checkbox') {
      return `Marque "${label}".`;
    }

    if (field.type === 'radio' || field.tagName === 'SELECT') {
      return `Selecione "${label}".`;
    }

    if (field.type === 'file') {
      return `Envie "${label}".`;
    }

    return `Preencha "${label}".`;
  };

  const validateStepPanels = (stepPanels) => {
    const invalidEntries = [];
    const processedRadioNames = new Set();

    stepPanels.forEach((stepPanel) => {
      const candidateFields = getStepCandidateFields(stepPanel);

      candidateFields.forEach((field) => {
        if (field.type === 'radio') {
          if (processedRadioNames.has(field.name)) return;
          processedRadioNames.add(field.name);

          const radioGroup = candidateFields.filter((item) => item.type === 'radio' && item.name === field.name);
          const hasChecked = radioGroup.some((item) => item.checked);
          if (hasChecked) return;

          radioGroup.forEach((item) => markFieldInvalid(item));
          invalidEntries.push({ field, message: buildValidationMessage(field, getFieldLabel(field)) });
          return;
        }

        if (field.type === 'email') {
          field.setCustomValidity('');
          const rawValue = String(field.value || '').trim();
          if (rawValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
            field.setCustomValidity('Informe um email válido.');
          }
        }

        const isValid = field.checkValidity();
        if (field.type === 'email') {
          field.setCustomValidity('');
        }

        if (isValid) return;

        markFieldInvalid(field);
        invalidEntries.push({ field, message: buildValidationMessage(field, getFieldLabel(field)) });
      });
    });

    return invalidEntries;
  };

  const handleChange = (e) => {
    const { name, value, options, multiple, type, checked } = e.target;
    clearFieldValidationState(e.target);
    setErrors([]);

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

  const setPreviewForPessoa = (pessoa, file) => {
    const key = pessoa || 'unico';
    const oldUrl = photoPreviewUrlsRef.current[key];
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
      photoPreviewUrlsRef.current[key] = '';
    }

    if (!file) {
      setPhotoPreviewByPessoa((prev) => ({ ...prev, [key]: '' }));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    photoPreviewUrlsRef.current[key] = nextUrl;
    setPhotoPreviewByPessoa((prev) => ({ ...prev, [key]: nextUrl }));
  };

  const readImageFromFile = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel ler a imagem enviada.'));
    };

    img.src = objectUrl;
  });

  const normalizeCardPhotoFile = async (file) => {
    if (!file) return null;

    const image = await readImageFromFile(file);
    const sourceWidth = Number(image.naturalWidth || image.width || 0);
    const sourceHeight = Number(image.naturalHeight || image.height || 0);
    if (!sourceWidth || !sourceHeight) {
      throw new Error('Imagem invalida para recorte.');
    }

    const targetWidth = 900;
    const targetHeight = 1200;
    const targetRatio = targetWidth / targetHeight;
    const sourceRatio = sourceWidth / sourceHeight;

    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let cropX = 0;
    let cropY = 0;

    if (sourceRatio > targetRatio) {
      cropWidth = Math.round(sourceHeight * targetRatio);
      cropX = Math.max(0, Math.round((sourceWidth - cropWidth) / 2));
    } else if (sourceRatio < targetRatio) {
      cropHeight = Math.round(sourceWidth / targetRatio);
      const extraVertical = Math.max(0, sourceHeight - cropHeight);
      // Mantem mais area superior para privilegiar o rosto no card.
      cropY = Math.max(0, Math.round(extraVertical * 0.22));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Nao foi possivel preparar a imagem para o card.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!blob) {
      throw new Error('Nao foi possivel gerar o arquivo final da foto.');
    }

    const baseName = String(file.name || 'foto')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'foto';

    return new File([blob], `${baseName}_card.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  };

  const handleFile = async (e) => {
    const selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    clearFieldValidationState(e.target);

    if (!selectedFile) {
      setFormData((prev) => ({ ...prev, foto: null }));
      setPhotoProcessingByPessoa((prev) => ({ ...prev, unico: false }));
      setPreviewForPessoa('unico', null);
      return;
    }

    setPhotoProcessingByPessoa((prev) => ({ ...prev, unico: true }));
    setErrors([]);
    try {
      const normalizedFile = await normalizeCardPhotoFile(selectedFile);
      setFormData((prev) => ({ ...prev, foto: normalizedFile }));
      setPreviewForPessoa('unico', normalizedFile);
    } catch (error) {
      setFormData((prev) => ({ ...prev, foto: selectedFile }));
      setPreviewForPessoa('unico', selectedFile);
      setErrors([{ msg: `Nao foi possivel ajustar automaticamente a foto: ${error.message}` }]);
    } finally {
      setPhotoProcessingByPessoa((prev) => ({ ...prev, unico: false }));
    }
  };

  const handleTiosChange = (pessoa, e) => {
    const { name, value, options, multiple, type, checked } = e.target;
    clearFieldValidationState(e.target);
    setErrors([]);

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

  const handleTiosFile = async (pessoa, e) => {
    const selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    clearFieldValidationState(e.target);

    if (!selectedFile) {
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: { ...prev[pessoa], foto: null },
      }));
      setPhotoProcessingByPessoa((prev) => ({ ...prev, [pessoa]: false }));
      setPreviewForPessoa(pessoa, null);
      return;
    }

    setPhotoProcessingByPessoa((prev) => ({ ...prev, [pessoa]: true }));
    setErrors([]);
    try {
      const normalizedFile = await normalizeCardPhotoFile(selectedFile);
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: { ...prev[pessoa], foto: normalizedFile },
      }));
      setPreviewForPessoa(pessoa, normalizedFile);
    } catch (error) {
      setTiosData((prev) => ({
        ...prev,
        [pessoa]: { ...prev[pessoa], foto: selectedFile },
      }));
      setPreviewForPessoa(pessoa, selectedFile);
      setErrors([{ msg: `Nao foi possivel ajustar automaticamente a foto: ${error.message}` }]);
    } finally {
      setPhotoProcessingByPessoa((prev) => ({ ...prev, [pessoa]: false }));
    }
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

    if (submitting) {
      return;
    }

    const hasPendingPhotoProcessing = Object.values(photoProcessingByPessoa).some(Boolean);
    if (hasPendingPhotoProcessing) {
      setErrors([{ msg: 'Aguarde o ajuste automatico da foto terminar para enviar.' }]);
      return;
    }

    if (!ejcAtivo) {
      setErrors([{ msg: 'Nenhum encontro ativo foi criado ainda. Aguarde a abertura do proximo EJC.' }]);
      return;
    }

    if (!validateCurrentStep()) {
      setErrors([{ msg: 'Preencha os campos obrigatórios desta etapa antes de enviar.' }]);
      return;
    }

    setSubmitting(true);
    const slowRequestHintId = setTimeout(() => {
      setErrors([{ msg: 'Estamos finalizando sua inscricao. Aguarde alguns instantes sem fechar a pagina.' }]);
    }, 30000);

    const readSubmitResponse = async (res) => {
      const contentType = String(res.headers.get('content-type') || '').toLowerCase();
      const isJsonResponse = contentType.includes('application/json');
      const payload = isJsonResponse ? await res.json() : null;

      if (!res.ok) {
        const serverMessage = payload?.errors?.[0]?.msg || payload?.error || `HTTP ${res.status}`;
        throw new Error(serverMessage);
      }

      return payload;
    };

    const appendFieldToFormData = (data, key, value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => data.append(key, item));
        return;
      }

      if (typeof value === 'boolean') {
        if (value) {
          data.append(key, 'true');
        }
        return;
      }

      if (value !== null && value !== '') {
        data.append(key, value);
      }
    };

    const resolveCheckboxValue = (selector, fallback) => {
      const checkbox = formRef.current?.querySelector(selector);
      if (checkbox) {
        return Boolean(checkbox.checked);
      }
      return Boolean(fallback);
    };

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
          const dataToSend = { ...tiosData[pessoa] };

          dataToSend.disponibilidadeEncontro = resolveCheckboxValue(`#disponibilidadeEncontro-${pessoa}`, dataToSend.disponibilidadeEncontro);
          dataToSend.lgpdConsentimento = resolveCheckboxValue(`#lgpdConsentimento-${pessoa}`, dataToSend.lgpdConsentimento);

          if (tiosModo === 'casal' && pessoa === 'pessoa2') {
            dataToSend.logradouro = tiosData.pessoa1.logradouro;
            dataToSend.bairro = tiosData.pessoa1.bairro;
          }

          Object.entries(dataToSend).forEach(([k, v]) => {
            appendFieldToFormData(data, k, v);
          });
          data.append('tipo', 'tios');
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
          return await readSubmitResponse(res);
        };

        const results = await Promise.all(pessoas.map((pessoa) => submitTiosMember(pessoa)));
        if (results.every((item) => item.success)) {
          console.log('[INFO] Ambos tios enviados com sucesso');
          clearTimeout(slowRequestHintId);
          redirectToSuccessPage();
        } else {
          const allErrors = results.flatMap((item) => item.errors || []);
          setErrors(allErrors.length > 0 ? allErrors : [{ msg: 'Erro inesperado' }]);
        }
      } else {
        // Para pessoa individual
        const data = new FormData();
        const formDataToSend = {
          ...formData,
          disponibilidadeEncontro: resolveCheckboxValue('#disponibilidadeEncontro-unico', formData.disponibilidadeEncontro),
          lgpdConsentimento: resolveCheckboxValue('#lgpdConsentimento-unico', formData.lgpdConsentimento),
        };

        Object.entries(formDataToSend).forEach(([k, v]) => {
          appendFieldToFormData(data, k, v);
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
        const json = await readSubmitResponse(res);
        if (json.success) {
          console.log('[INFO] Individual enviado com sucesso');
          clearTimeout(slowRequestHintId);
          redirectToSuccessPage();
        } else {
          setErrors(json.errors || [{ msg: 'Erro inesperado' }]);
        }
      }
    } catch (err) {
      console.error('Erro:', err);
      setErrors([{ msg: 'Erro ao enviar: ' + err.message }]);
    } finally {
      clearTimeout(slowRequestHintId);
      setSubmitting(false);
    }
  };

  const getFieldPessoa = (field) => {
    const source = String(field?.id || field?.name || '');
    if (source.includes('pessoa2')) return 'pessoa2';
    if (source.includes('pessoa1')) return 'pessoa1';
    return 'unico';
  };

  const isEssentialRequiredField = (field) => {
    if (!field || !field.name) return false;
    const fieldName = String(field.name);
    const pessoa = getFieldPessoa(field);

    if (fieldName === 'nomeCompleto') return true;
    if (fieldName === 'email') return true;
    if (fieldName === 'dataNascimento') return true;
    if (fieldName === 'disponibilidadeEncontro') return true;

    // Em casal de tios, endereço é preenchido uma única vez (pessoa1).
    if (fieldName === 'logradouro') {
      if (isEncontro && tipo === 'tios' && tiosModo === 'casal') {
        return pessoa === 'pessoa1';
      }
      return true;
    }

    return false;
  };

  const validateCurrentStep = () => {
    if (!shouldUseStepper) return true;

    const formElement = formRef.current;
    if (!formElement) return true;

    clearValidationState(formElement);

    const stepPanels = Array.from(formElement.querySelectorAll(`[data-step-panel="${currentStep}"]`));
    if (!stepPanels.length) return true;

    const invalidEntries = validateStepPanels(stepPanels);
    if (invalidEntries.length > 0) {
      const uniqueMessages = [...new Set(invalidEntries.map((entry) => entry.message))];
      setErrors(uniqueMessages.map((msg) => ({ msg })));

      const firstInvalidField = invalidEntries[0].field;
      if (firstInvalidField) {
        if (typeof firstInvalidField.focus === 'function') {
          firstInvalidField.focus({ preventScroll: true });
        }

        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof firstInvalidField.reportValidity === 'function') {
          firstInvalidField.reportValidity();
        }
      }

      return false;
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
      setErrors([{ msg: 'Preencha os campos obrigatórios desta etapa antes de continuar.' }]);
      return;
    }

    setErrors([]);
    changeStep(Math.min(currentStep + 1, activeSteps.length - 1));
  };

  const handlePreviousStep = () => {
    setErrors([]);
    changeStep(Math.max(currentStep - 1, 0));
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';

    const today = new Date();
    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return '';

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    return age >= 0 ? String(age) : '';
  };

  const renderPhotoUploadField = ({ pessoa, data, handleF, label = 'Anexar foto (JPG ou PNG) *' }) => {
    const fileName = data?.foto?.name || '';
    const pessoaKey = pessoa || 'unico';
    const previewUrl = photoPreviewByPessoa[pessoaKey] || '';
    const isPhotoProcessing = !!photoProcessingByPessoa[pessoaKey];

    return (
      <div className="upload-field-shell">
        <div className="upload-field-head">
          <div className="upload-field-icon" aria-hidden="true">
            <i className="fas fa-cloud-arrow-up"></i>
          </div>
          <div className="upload-field-copy">
            <label htmlFor={`foto-${pessoa}`} className="form-label upload-field-label">{label}</label>
            <small className="upload-field-hint">
              {fileName ? 'Foto ajustada para o padrao do card PDF.' : 'Selecione uma imagem nitida, preferencialmente em retrato.'}
            </small>
          </div>
        </div>

        <input
          className="form-control form-control-file-modern"
          type="file"
          id={`foto-${pessoa}`}
          name="foto"
          accept="image/*"
          onChange={handleF}
          disabled={isPhotoProcessing}
          required
        />

        {previewUrl ? (
          <div className="mt-3">
            <div className="mb-1 text-light" style={{ fontSize: '0.8rem' }}>
              Previa do enquadramento final do card
            </div>
            <div style={{ width: 'min(210px, 100%)', aspectRatio: '3 / 4', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(7, 11, 28, 0.75)' }}>
              <img src={previewUrl} alt="Previa da foto ajustada para o card" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
        ) : null}

        <div className="upload-field-meta" aria-live="polite">
          <span className={`upload-file-pill${fileName ? ' has-file' : ''}`}>
            <i className={`fas ${fileName ? 'fa-circle-check' : 'fa-image'}`}></i>
            {fileName || 'Nenhum arquivo selecionado'}
          </span>
          <span className="upload-file-spec">
            {isPhotoProcessing ? 'Ajustando foto para o card...' : 'Formatos aceitos: JPG e PNG. A foto sera enviada no enquadramento do card PDF.'}
          </span>
        </div>
      </div>
    );
  };

  const renderObservacoesField = ({
    pessoa,
    data,
    handleCh,
    label = 'Observações',
    placeholder = '',
    helperText = '',
    required = false,
    idSuffix = 'observacoes',
    fieldType = 'textarea',
  }) => (
    <div className="mb-3">
      <label htmlFor={`${idSuffix}-${pessoa}`} className="form-label">{label}</label>
      {fieldType === 'date' ? (
        <input
          type="date"
          className="form-control"
          id={`${idSuffix}-${pessoa}`}
          name="observacoes"
          value={data.observacoes}
          onChange={handleCh}
          required={required}
        />
      ) : (
        <textarea
          className="form-control"
          id={`${idSuffix}-${pessoa}`}
          name="observacoes"
          value={data.observacoes}
          onChange={handleCh}
          rows="3"
          placeholder={placeholder}
          required={required}
        ></textarea>
      )}
      {helperText ? <small className="form-text text-light d-block mt-2">{helperText}</small> : null}
    </div>
  );

  const renderEncontristaStepFields = ({ pessoa, data, handleCh, handleF }) => {
    const isNoivo = data.estadoCivil === 'Noivo (a)';

    return (
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
              Gênero *
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
            <label htmlFor={`idade-${pessoa}`} className="form-label">
              Idade
            </label>
            <input type="text" className="form-control" id={`idade-${pessoa}`} value={calculateAge(data.dataNascimento)} readOnly placeholder="Calculada automaticamente" />
          </div>

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

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`email-${pessoa}`} className="form-label">
              E-mail
            </label>
            <input type="email" className="form-control" id={`email-${pessoa}`} name="email" value={data.email} onChange={handleCh} placeholder="você@email.com" />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 1 ? ' is-active' : ''}`} data-step-panel="1" hidden={currentStep !== 1}>
        <div className="form-section-title">
          <i className="fas fa-location-dot"></i>
          Endereço e convivência
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
          <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} placeholder="Rua e número" required />
        </div>

        <div className="mb-3">
          <label htmlFor={`complementoReferencia-${pessoa}`} className="form-label">
            Complemento ou referência
          </label>
          <input type="text" className="form-control" id={`complementoReferencia-${pessoa}`} name="complementoReferencia" value={data.complementoReferencia} onChange={handleCh} placeholder="Casa, bloco, ponto de referência" />
        </div>

        <div className="mb-3">
          <label htmlFor={`comQuemReside-${pessoa}`} className="form-label">
            Com quem você reside no endereço acima?
          </label>
          <textarea className="form-control" id={`comQuemReside-${pessoa}`} name="comQuemReside" value={data.comQuemReside} onChange={handleCh} rows="3"></textarea>
        </div>

        <div className="mb-3">
          <label htmlFor={`paisVivosContato-${pessoa}`} className="form-label">
            Os pais são vivos? Se sim, têm contato com eles?
          </label>
          <textarea className="form-control" id={`paisVivosContato-${pessoa}`} name="paisVivosContato" value={data.paisVivosContato} onChange={handleCh} rows="3"></textarea>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-people-roof"></i>
          Família, saúde e igreja
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`nomeMae-${pessoa}`} className="form-label">Nome da Mãe *</label>
            <input type="text" className="form-control" id={`nomeMae-${pessoa}`} name="nomeMae" value={data.nomeMae} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`telefoneMae-${pessoa}`} className="form-label">Telefone da Mãe *</label>
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

        <div className="mb-3">
          <label className="form-label">
            Estado civil *
          </label>
          <div className="step-radio-grid">
            {['Solteiro (a)', 'Casado (a)', 'Divorciado (a)', 'Viúvo (a)', 'Noivo (a)', 'Amasiado (a) (Morando junto)'].map((opt) => (
              <div className="form-check step-choice" key={`${pessoa || 'unico'}-estado-${opt}`}>
                <input className="form-check-input" type="radio" id={`estadoCivil-${pessoa}-${opt}`} name="estadoCivil" value={opt} checked={data.estadoCivil === opt} onChange={handleCh} required />
                <label className="form-check-label" htmlFor={`estadoCivil-${pessoa}-${opt}`}>
                  {opt}
                </label>
              </div>
            ))}
          </div>
        </div>

        {isNoivo && renderObservacoesField({
          pessoa,
          data,
          handleCh,
          label: 'Data do casamento *',
          helperText: 'Informe a data prevista do casamento.',
          required: true,
          idSuffix: 'observacoes-casamento',
          fieldType: 'date',
        })}
        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`possuiFilhos-${pessoa}`} className="form-label">Possui filhos?</label>
            <select className="form-control" id={`possuiFilhos-${pessoa}`} name="possuiFilhos" value={data.possuiFilhos || 'nao'} onChange={handleCh}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor={`filhosDetalhes-${pessoa}`} className="form-label">Se sim, quantos e qual a idade?</label>
            <input type="text" className="form-control" id={`filhosDetalhes-${pessoa}`} name="filhosDetalhes" value={data.filhosDetalhes} onChange={handleCh} disabled={(data.possuiFilhos || 'nao') !== 'sim'} required={(data.possuiFilhos || 'nao') === 'sim'} />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`grauEscolaridade-${pessoa}`} className="form-label">Qual seu grau de escolaridade?</label>
            <select className="form-control" id={`grauEscolaridade-${pessoa}`} name="grauEscolaridade" value={data.grauEscolaridade} onChange={handleCh}>
              <option value="">Selecione</option>
              <option value="Fundamental incompleto">Fundamental incompleto</option>
              <option value="Fundamental completo">Fundamental completo</option>
              <option value="Médio incompleto">Médio incompleto</option>
              <option value="Médio completo">Médio completo</option>
              <option value="Superior incompleto">Superior incompleto</option>
              <option value="Superior completo">Superior completo</option>
              <option value="Pós-graduação">Pós-graduação</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor={`tamanhoCamisa-${pessoa}`} className="form-label">Qual o seu tamanho de camisa normalmente?</label>
            <select className="form-control" id={`tamanhoCamisa-${pessoa}`} name="tamanhoCamisa" value={data.tamanhoCamisa} onChange={handleCh}>
              <option value="">Selecione</option>
              <option value="PP">PP</option>
              <option value="P">P</option>
              <option value="M">M</option>
              <option value="G">G</option>
              <option value="GG">GG</option>
              <option value="XG">XG</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`talentoHabilidadeArtistica-${pessoa}`} className="form-label">Possui algum talento ou habilidade artística que goste de praticar?</label>
          <textarea className="form-control" id={`talentoHabilidadeArtistica-${pessoa}`} name="talentoHabilidadeArtistica" value={data.talentoHabilidadeArtistica} onChange={handleCh} rows="3"></textarea>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`instrumentoMusical-${pessoa}`} className="form-label">Toca algum instrumento musical ou canta? *</label>
            <input type="text" className="form-control" id={`instrumentoMusical-${pessoa}`} name="instrumentoMusical" value={data.instrumentoMusical} onChange={handleCh} placeholder="Ex: Violão, canto, teclado ou Não" required />
          </div>
          <div className="mb-3">
            <label htmlFor={`quadroSaude-${pessoa}`} className="form-label">Possui algum quadro de saúde físico ou mental? Qual?</label>
            <input type="text" className="form-control" id={`quadroSaude-${pessoa}`} name="quadroSaude" value={data.quadroSaude} onChange={handleCh} />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`medicamentoControlado-${pessoa}`} className="form-label">Faz o uso de algum medicamento controlado? Qual?</label>
            <input type="text" className="form-control" id={`medicamentoControlado-${pessoa}`} name="medicamentoControlado" value={data.medicamentoControlado} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`intolerante-${pessoa}`} className="form-label">Intolerância ou restrição alimentar</label>
            <input type="text" className="form-control" id={`intolerante-${pessoa}`} name="intolerante" value={data.intolerante} onChange={handleCh} />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`ehAlergico-${pessoa}`} className="form-label">É alérgico?</label>
            <select className="form-control" id={`ehAlergico-${pessoa}`} name="ehAlergico" value={data.ehAlergico || 'nao'} onChange={handleCh}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor={`alergiaDescricao-${pessoa}`} className="form-label">Se sim, a que?</label>
            <input
              type="text"
              className="form-control"
              id={`alergiaDescricao-${pessoa}`}
              name="alergiaDescricao"
              value={data.alergiaDescricao || ''}
              onChange={handleCh}
              placeholder="Ex: amendoim, dipirona, lactose"
              disabled={(data.ehAlergico || 'nao') !== 'sim'}
              required={(data.ehAlergico || 'nao') === 'sim'}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`religiosidadeAtual-${pessoa}`} className="form-label">Religiosamente, como você se considera hoje?</label>
            <input type="text" className="form-control" id={`religiosidadeAtual-${pessoa}`} name="religiosidadeAtual" value={data.religiosidadeAtual} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`paroquiaFrequenta-${pessoa}`} className="form-label">Qual paróquia frequenta? *</label>
            <input type="text" className="form-control" id={`paroquiaFrequenta-${pessoa}`} name="paroquiaFrequenta" value={data.paroquiaFrequenta} onChange={handleCh} required />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`participaMovimentoIgreja-${pessoa}`} className="form-label">Participa de algum movimento ou pastoral da igreja? *</label>
          <input type="text" className="form-control" id={`participaMovimentoIgreja-${pessoa}`} name="participaMovimentoIgreja" value={data.participaMovimentoIgreja} onChange={handleCh} required />
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 3 ? ' is-active' : ''}`} data-step-panel="3" hidden={currentStep !== 3}>
        <div className="form-section-title">
          <i className="fas fa-flag-checkered"></i>
          Finalização da inscrição
        </div>

        <div className="form-row">
          <div className="mb-3 final-question-col">
            <div className="final-question-box final-question-box-lg">
              <label htmlFor={`conhecidoInscricaoHoje-${pessoa}`} className="form-label">Tem algum conhecido fazendo a inscrição hoje? *</label>
              <textarea className="form-control final-question-input final-question-textarea-lg" id={`conhecidoInscricaoHoje-${pessoa}`} name="conhecidoInscricaoHoje" value={data.conhecidoInscricaoHoje} onChange={handleCh} placeholder="Ex: Nome do conhecido ou Não" rows="3" required></textarea>
            </div>
          </div>
          <div className="mb-3 final-question-col">
            <div className="final-question-box final-question-box-lg">
              <label htmlFor={`conhecidoFezEjc-${pessoa}`} className="form-label">Tem algum conhecido que já fez EJC? *</label>
              <textarea className="form-control final-question-input final-question-textarea-lg" id={`conhecidoFezEjc-${pessoa}`} name="conhecidoFezEjc" value={data.conhecidoFezEjc} onChange={handleCh} placeholder="Ex: Nome de quem já fez ou Não" rows="3" required></textarea>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`inscricaoAnterior-${pessoa}`} className="form-label">Você já fez alguma inscrição antes? Se sim, qual EJC. *</label>
          <textarea className="form-control compact-response-textarea" id={`inscricaoAnterior-${pessoa}`} name="inscricaoAnterior" value={data.inscricaoAnterior} onChange={handleCh} rows="2" placeholder="Ex: Não / EJC 2024" required></textarea>
        </div>

        <div className="mb-3">
          <label htmlFor={`expectativaXixEjcCop-${pessoa}`} className="form-label">Qual sua expectativa para o XIX ECJ COP? E por que quer fazer o encontro? *</label>
          <textarea className="form-control compact-response-textarea" id={`expectativaXixEjcCop-${pessoa}`} name="expectativaXixEjcCop" value={data.expectativaXixEjcCop} onChange={handleCh} rows="3" required></textarea>
        </div>

        <div className="mb-3">
          <div className="final-question-box">
            <label className="form-label d-block">O XIX EJC COP está previsto para os dias 31/07, 01/08 e 02/08. Para participar precisamos que você esteja disponível:</label>
            <small className="final-question-hint d-block mb-3">Sexta-feira (31/07): A partir das 18:00h<br />Sábado (01/08): Dia todo<br />Domingo (02/08): Dia todo</small>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id={`disponibilidadeEncontro-${pessoa || 'unico'}`} name="disponibilidadeEncontro" checked={!!data.disponibilidadeEncontro} onChange={handleCh} required />
              <label className="form-check-label" htmlFor={`disponibilidadeEncontro-${pessoa || 'unico'}`}>
                Confirmo minha disponibilidade integral para os dias e horários informados.
              </label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            {renderPhotoUploadField({ pessoa, data, handleF, label: 'Anexar foto (JPG ou PNG) *' })}
          </div>
          {!isNoivo && renderObservacoesField({ pessoa, data, handleCh })}
          {!isNoivo && renderObservacoesField({ pessoa, data, handleCh })}
        </div>

        {renderReviewSummary('Resumo da inscrição', [
          ['Nome', data.nomeCompleto],
          ['Telefone', data.telefone],
          ['Instagram', data.instagram],
          ['Paróquia', data.paroquiaFrequenta],
          ['Disponibilidade', data.disponibilidadeEncontro ? 'Confirmada' : 'Pendente'],
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
  };

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
            <label htmlFor={`genero-${pessoa}`} className="form-label">Gênero *</label>
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

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`idade-${pessoa}`} className="form-label">Idade</label>
            <input type="text" className="form-control" id={`idade-${pessoa}`} value={calculateAge(data.dataNascimento)} readOnly placeholder="Calculada automaticamente" />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 1 ? ' is-active' : ''}`} data-step-panel="1" hidden={currentStep !== 1}>
        <div className="form-section-title">
          <i className="fas fa-cross"></i>
          Trajetória no EJC
        </div>

        <div className="mb-3">
          <label htmlFor={`ejc-${pessoa}`} className="form-label">Qual EJC/ECC você fez? *</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-church"></i></span>
            <select
              className="form-control"
              id={`ejc-${pessoa}`}
              name="ejc"
              value={data.ejc === 'EJC' || data.ejc === 'ECC' ? data.ejc : (data.ejc ? 'Outro' : '')}
              onChange={e => {
                const value = e.target.value;
                if (value === 'Outro') {
                  handleCh({ target: { name: 'ejc', value: data.ejc && data.ejc !== 'EJC' && data.ejc !== 'ECC' ? data.ejc : '' } });
                } else {
                  handleCh({ target: { name: 'ejc', value } });
                  if (value !== 'EJC' && value !== 'ECC') {
                    handleCh({ target: { name: 'qualEjcPertence', value: '' } });
                  }
                }
              }}
              required
            >
              <option value="">Selecione</option>
              <option value="EJC">EJC</option>
              <option value="ECC">ECC</option>
              <option value="Outro">Outro (especificar)</option>
            </select>
          </div>
          {/* Campo para especificar qual EJC ou ECC fez */}
          {(data.ejc === 'EJC' || data.ejc === 'ECC') && (
            <div className="input-group mt-2">
              <span className="input-group-text"><i className="fas fa-hashtag"></i></span>
              <input
                type="text"
                className="form-control"
                id={`qualEjcPertence-${pessoa}`}
                name="qualEjcPertence"
                value={data.qualEjcPertence}
                onChange={handleCh}
                placeholder={data.ejc === 'EJC' ? 'Ex: XIX EJC COP, EJC 2023...' : 'Ex: ECC 15, ECC 2022...'}
                required
              />
            </div>
          )}
          {/* Campo extra para "Outro" */}
          {(data.ejc && data.ejc !== 'EJC' && data.ejc !== 'ECC') && (
            <div className="input-group mt-2">
              <span className="input-group-text"><i className="fas fa-pen"></i></span>
              <input
                type="text"
                className="form-control"
                id={`ejc-outro-${pessoa}`}
                name="ejc"
                value={data.ejc !== 'EJC' && data.ejc !== 'ECC' ? data.ejc : ''}
                onChange={handleCh}
                placeholder="Informe o nome do encontro"
                required
              />
            </div>
          )}
          {!!ejcAtivo && <small className="text-muted d-block mt-2">Vínculo automático com o encontro ativo: {ejcAtivo}</small>}
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
                <option value="nao">Não</option>
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
                      {item.nomeCompleto}{item.tioParceiroId ? ' • já vinculado(a)' : ''}
                    </option>
                  ))}
                </select>
                <small className="form-text text-light d-block mt-2">
                  {carregandoTiosDisponiveis
                    ? 'Carregando tios cadastrados...'
                    : 'Esse vínculo faz o casal sair lado a lado no PDF das equipes e no quadrante.'}
                </small>
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <label htmlFor={`equipeServiu-${pessoa}`} className="form-label">Equipe que já serviu</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-serviu-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeServiu-${pessoa}-${opt}`} name="equipeServiu" value={opt} checked={data.equipeServiu.includes(opt)} onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeServiu', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeServiu-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
          <small className="text-muted">Pode selecionar mais de uma opção.</small>
        </div>

        <div className="mb-3">
          <label htmlFor={`equipeCoordenou-${pessoa}`} className="form-label">Equipe que já coordenou</label>
          <div className="equipe-options-grid d-flex flex-column gap-2">
            {equipeOptions.map((opt) => (
              <div className="form-check" key={`${pessoa || 'unico'}-coordenou-${opt}`}>
                <input className="form-check-input" type="checkbox" id={`equipeCoordenou-${pessoa}-${opt}`} name="equipeCoordenou" value={opt} checked={data.equipeCoordenou.includes(opt)} onChange={(e) => toggleEquipeSelection(isTios ? pessoa : null, 'equipeCoordenou', opt, e.target.checked)} />
                <label className="form-check-label" htmlFor={`equipeCoordenou-${pessoa}-${opt}`}>{opt}</label>
              </div>
            ))}
          </div>
          <small className="text-muted">Pode selecionar mais de uma opção.</small>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-address-book"></i>
          Contato e localização
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`cep-${pessoa}`} className="form-label">CEP</label>
            <input type="text" className="form-control" id={`cep-${pessoa}`} name="cep" value={data.cep || ''} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`logradouro-${pessoa}`} className="form-label">Logradouro *</label>
            <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} required />
          </div>
          <div className="mb-3">
            <label htmlFor={`bairro-${pessoa}`} className="form-label">Bairro *</label>
            <input type="text" className="form-control" id={`bairro-${pessoa}`} name="bairro" value={data.bairro} onChange={handleCh} required />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`complementoReferencia-${pessoa}`} className="form-label">Complemento ou referência</label>
          <input type="text" className="form-control" id={`complementoReferencia-${pessoa}`} name="complementoReferencia" value={data.complementoReferencia || ''} onChange={handleCh} placeholder="Casa, bloco, ponto de referência" />
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
          Finalização e cuidados
        </div>

        <div className="mb-3">
          <div className="final-question-box">
            <label className="form-label d-block">O XIX EJC COP está previsto para os dias 31/07, 01/08 e 02/08. Para participar precisamos que você esteja disponível:</label>
            <small className="final-question-hint d-block mb-3">Sexta-feira (31/07): A partir das 18:00h<br />Sábado (01/08): Dia todo<br />Domingo (02/08): Dia todo</small>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id={`disponibilidadeEncontro-${pessoa || 'unico'}`} name="disponibilidadeEncontro" checked={!!data.disponibilidadeEncontro} onChange={handleCh} required />
              <label className="form-check-label" htmlFor={`disponibilidadeEncontro-${pessoa || 'unico'}`}>
                Confirmo minha disponibilidade integral para os dias e horários informados.
              </label>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`talentoHabilidadeArtistica-${pessoa}`} className="form-label">Possui algum talento ou habilidade artística que goste de praticar?</label>
          <textarea className="form-control" id={`talentoHabilidadeArtistica-${pessoa}`} name="talentoHabilidadeArtistica" value={data.talentoHabilidadeArtistica || ''} onChange={handleCh} rows="3"></textarea>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`quadroSaude-${pessoa}`} className="form-label">Possui algum quadro de saúde físico ou mental? Qual?</label>
            <input type="text" className="form-control" id={`quadroSaude-${pessoa}`} name="quadroSaude" value={data.quadroSaude || ''} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`medicamentoControlado-${pessoa}`} className="form-label">Faz o uso de algum medicamento controlado? Qual?</label>
            <input type="text" className="form-control" id={`medicamentoControlado-${pessoa}`} name="medicamentoControlado" value={data.medicamentoControlado || ''} onChange={handleCh} />
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`intolerante-${pessoa}`} className="form-label">Intolerante a alguma comida</label>
            <input type="text" className="form-control" id={`intolerante-${pessoa}`} name="intolerante" value={data.intolerante} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`ehAlergico-${pessoa}`} className="form-label">Possui alguma alergia?</label>
            <select className="form-control" id={`ehAlergico-${pessoa}`} name="ehAlergico" value={data.ehAlergico || 'nao'} onChange={handleCh}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`alergiaDescricao-${pessoa}`} className="form-label">Se sim, a que?</label>
          <input
            type="text"
            className="form-control"
            id={`alergiaDescricao-${pessoa}`}
            name="alergiaDescricao"
            value={data.alergiaDescricao || ''}
            onChange={handleCh}
            placeholder="Ex: amendoim, dipirona, lactose"
            disabled={(data.ehAlergico || 'nao') !== 'sim'}
            required={(data.ehAlergico || 'nao') === 'sim'}
          />
        </div>

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`religiosidadeAtual-${pessoa}`} className="form-label">Religiosamente, como você se considera hoje?</label>
            <input type="text" className="form-control" id={`religiosidadeAtual-${pessoa}`} name="religiosidadeAtual" value={data.religiosidadeAtual || ''} onChange={handleCh} />
          </div>
          <div className="mb-3">
            <label htmlFor={`paroquiaFrequenta-${pessoa}`} className="form-label">Qual paróquia frequenta?</label>
            <input type="text" className="form-control" id={`paroquiaFrequenta-${pessoa}`} name="paroquiaFrequenta" value={data.paroquiaFrequenta || ''} onChange={handleCh} />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`participaMovimentoIgreja-${pessoa}`} className="form-label">Participa de algum movimento ou pastoral da igreja?</label>
          <input type="text" className="form-control" id={`participaMovimentoIgreja-${pessoa}`} name="participaMovimentoIgreja" value={data.participaMovimentoIgreja || ''} onChange={handleCh} />
        </div>

        <div className="mb-3">
          {renderPhotoUploadField({ pessoa, data, handleF, label: 'Upload de foto (JPG ou PNG) *' })}
        </div>

        <div className="mb-3">
          <label htmlFor={`observacoes-${pessoa}`} className="form-label">Observações</label>
          <textarea className="form-control" id={`observacoes-${pessoa}`} name="observacoes" value={data.observacoes} onChange={handleCh} rows="3"></textarea>
        </div>

        {renderReviewSummary('Resumo do encontro', [
          ['Nome', data.nomeCompleto],
          ['EJC', data.ejc],
          ['Telefone', data.telefone],
          ['Email', data.email],
          ['Paróquia', data.paroquiaFrequenta],
          ['Endereço', `${data.logradouro || ''}${data.logradouro && data.bairro ? ' - ' : ''}${data.bairro || ''}`],
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
            <strong>{value && String(value).trim() !== '' ? value : 'Não informado'}</strong>
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
            <label htmlFor={`genero-${pessoa}`} className="form-label">Gênero *</label>
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
          Trajetória no EJC
        </div>

        <div className="mb-3">
          <label htmlFor={`ejc-${pessoa}`} className="form-label">Qual EJC/ECC você fez? *</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-church"></i></span>
            <select
              className="form-control"
              id={`ejc-${pessoa}`}
              name="ejc"
              value={data.ejc === 'EJC' || data.ejc === 'ECC' ? data.ejc : (data.ejc ? 'Outro' : '')}
              onChange={e => {
                const value = e.target.value;
                if (value === 'Outro') {
                  handleCh({ target: { name: 'ejc', value: data.ejc && data.ejc !== 'EJC' && data.ejc !== 'ECC' ? data.ejc : '' } });
                } else {
                  handleCh({ target: { name: 'ejc', value } });
                  if (value !== 'EJC' && value !== 'ECC') {
                    handleCh({ target: { name: 'qualEjcPertence', value: '' } });
                  }
                }
              }}
              required
            >
              <option value="">Selecione</option>
              <option value="EJC">EJC</option>
              <option value="ECC">ECC</option>
              <option value="Outro">Outro (especificar)</option>
            </select>
          </div>
          {/* Campo para especificar qual EJC ou ECC fez */}
          {(data.ejc === 'EJC' || data.ejc === 'ECC') && (
            <div className="input-group mt-2">
              <span className="input-group-text"><i className="fas fa-hashtag"></i></span>
              <input
                type="text"
                className="form-control"
                id={`qualEjcPertence-${pessoa}`}
                name="qualEjcPertence"
                value={data.qualEjcPertence}
                onChange={handleCh}
                placeholder={data.ejc === 'EJC' ? 'Ex: XIX EJC COP, EJC 2023...' : 'Ex: ECC 15, ECC 2022...'}
                required
              />
            </div>
          )}
          {/* Campo extra para "Outro" */}
          {(data.ejc && data.ejc !== 'EJC' && data.ejc !== 'ECC') && (
            <div className="input-group mt-2">
              <span className="input-group-text"><i className="fas fa-pen"></i></span>
              <input
                type="text"
                className="form-control"
                id={`ejc-outro-${pessoa}`}
                name="ejc"
                value={data.ejc !== 'EJC' && data.ejc !== 'ECC' ? data.ejc : ''}
                onChange={handleCh}
                placeholder="Informe o nome do encontro"
                required
              />
            </div>
          )}
          {!!ejcAtivo && <small className="text-muted d-block mt-2">Vínculo automático com o encontro ativo: {ejcAtivo}</small>}
        </div>

        <div className="mb-3">
          <label htmlFor={`equipeServiu-${pessoa}`} className="form-label">Equipe que já serviu</label>
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
          <label htmlFor={`equipeCoordenou-${pessoa}`} className="form-label">Equipe que já coordenou</label>
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
            <option value="false">Não</option>
          </select>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 2 ? ' is-active' : ''}`} data-step-panel="2" hidden={currentStep !== 2}>
        <div className="form-section-title">
          <i className="fas fa-address-book"></i>
          Contato e localização
        </div>

        {tiosModo === 'casal' && pessoa === 'pessoa2' && (
          <div className="alert alert-info mb-3">
            <i className="fas fa-location-dot me-2"></i>
            Endereço informado uma única vez no cadastro da Pessoa 1 e compartilhado para o casal.
          </div>
        )}

        {!(tiosModo === 'casal' && pessoa === 'pessoa2') && (
          <div className="form-row">
            <div className="mb-3">
              <label htmlFor={`logradouro-${pessoa}`} className="form-label">Logradouro *</label>
              <input type="text" className="form-control" id={`logradouro-${pessoa}`} name="logradouro" value={data.logradouro} onChange={handleCh} required />
            </div>
            <div className="mb-3">
              <label htmlFor={`bairro-${pessoa}`} className="form-label">Bairro</label>
              <input type="text" className="form-control" id={`bairro-${pessoa}`} name="bairro" value={data.bairro} onChange={handleCh} />
            </div>
          </div>
        )}

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

        <div className="form-row">
          <div className="mb-3">
            <label htmlFor={`ehAlergico-${pessoa}`} className="form-label">É alérgico?</label>
            <select className="form-control" id={`ehAlergico-${pessoa}`} name="ehAlergico" value={data.ehAlergico || 'nao'} onChange={handleCh}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor={`alergiaDescricao-${pessoa}`} className="form-label">Se sim, a que?</label>
            <input
              type="text"
              className="form-control"
              id={`alergiaDescricao-${pessoa}`}
              name="alergiaDescricao"
              value={data.alergiaDescricao || ''}
              onChange={handleCh}
              placeholder="Ex: amendoim, dipirona, lactose"
              disabled={(data.ehAlergico || 'nao') !== 'sim'}
              required={(data.ehAlergico || 'nao') === 'sim'}
            />
          </div>
        </div>
      </section>

      <section className={`form-step-panel${currentStep === 3 ? ' is-active' : ''}`} data-step-panel="3" hidden={currentStep !== 3}>
        <div className="form-section-title">
          <i className="fas fa-flag-checkered"></i>
          Revisão final
        </div>

        <div className="mb-3">
          <div className="final-question-box">
            <label className="form-label d-block">O XIX EJC COP está previsto para os dias 31/07, 01/08 e 02/08. Para participar precisamos que você esteja disponível:</label>
            <small className="final-question-hint d-block mb-3">Sexta-feira (31/07): A partir das 18:00h<br />Sábado (01/08): Dia todo<br />Domingo (02/08): Dia todo</small>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id={`disponibilidadeEncontro-${pessoa || 'unico'}`} name="disponibilidadeEncontro" checked={!!data.disponibilidadeEncontro} onChange={handleCh} required />
              <label className="form-check-label" htmlFor={`disponibilidadeEncontro-${pessoa || 'unico'}`}>
                Confirmo minha disponibilidade integral para os dias e horários informados.
              </label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="mb-3">
            {renderPhotoUploadField({ pessoa, data, handleF, label: 'Upload de foto (JPG ou PNG) *' })}
          </div>
          <div className="mb-3">
            <label htmlFor={`observacoes-${pessoa}`} className="form-label">Observações</label>
            <textarea className="form-control" id={`observacoes-${pessoa}`} name="observacoes" value={data.observacoes} onChange={handleCh} rows="3"></textarea>
          </div>
        </div>

        {renderReviewSummary(`Resumo ${pessoa === 'pessoa1' ? 'da pessoa 1' : 'da pessoa 2'}`, [
          ['Nome', data.nomeCompleto],
          ['EJC', data.ejc],
          ['Telefone', data.telefone],
          ['Email', data.email],
          ['Veículo próprio', data.temVeiculoProprio === 'true' ? 'Sim' : data.temVeiculoProprio === 'false' ? 'Não' : 'Não informado'],
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
              title: 'Inscrição dos Tios Confirmada!',
              subtitle: tiosModo === 'casal' ? 'Cadastro de casal concluído com sucesso' : (tioComParceiro === 'sim' ? 'Cadastro com vínculo de casal concluído com sucesso' : 'Cadastro de tio solo concluído com sucesso'),
              description: 'Recebemos as informações e sua participação no encontro foi registrada. Em breve você receberá os próximos passos.',
              note: 'Dados dos tios validados e gravados no sistema',
            }
          : {
              title: 'Inscrição de Encontreiro Confirmada!',
              subtitle: 'Tudo certo com seu cadastro para o encontro',
              description: 'Seu envio foi concluído com sucesso. Agora nossa equipe seguirá com a organização e retornará com orientações.',
              note: 'Cadastro de encontro registrado com sucesso',
            })
      : {
          title: 'Inscrição Confirmada!',
          subtitle: 'Obrigado por sua inscrição no EJC COP',
          description: 'Seus dados foram enviados com sucesso. Aguarde a confirmação para as próximas etapas do evento.',
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
            Fazer nova inscrição
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
    const fieldsToTrack = !isEncontro
      ? ['nomeCompleto', 'comoQuerSerChamado', 'genero', 'dataNascimento', 'telefone', 'instagram']
      : ['nomeCompleto', 'comoQuerSerChamado', 'genero', 'dataNascimento', 'telefone', 'email'];

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
        label: tiosModo === 'casal' ? 'Cadastro de casal' : (tioComParceiro === 'sim' ? 'Cadastro com vínculo de casal' : 'Cadastro de tio solo'),
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
                  <h3 className="text-center mb-3 form-shell-title">Tipo de inscrição</h3>
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
                  <div className="form-stepper" aria-label="Etapas do formulário">
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
                            {step.description ? <small>{step.description}</small> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="form-step-summary" role="status" aria-live="polite">
                    <span>Etapa {currentStep + 1} de {activeSteps.length}</span>
                    <strong>{currentStepMeta.label}</strong>
                    {currentStepMeta.description ? <p>{currentStepMeta.description}</p> : null}
                  </div>
                </>
              )}

            <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" noValidate aria-busy={submitting ? 'true' : 'false'}>
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
                    Próxima etapa<i className="fas fa-arrow-right ms-2"></i>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary form-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      'Enviando...'
                    ) : (
                      <><i className="fas fa-paper-plane me-2"></i>{!isEncontro ? 'Finalizar inscrição' : 'Enviar inscrição'}</>
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

