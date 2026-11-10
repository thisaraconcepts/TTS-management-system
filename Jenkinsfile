pipeline {
    agent any
    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        
                        # Cache Node.js binary if already unpacked
                        if [ ! -d "node-$VERSION-$DISTRO/bin" ]; then
                            echo "Downloading Node.js $VERSION..."
                            curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                            tar -xzf node.tar.gz
                            rm -f node.tar.gz
                        fi
                        
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        
                        echo "Installing dependencies..."
                        npm install
                        chmod +x node_modules/.bin/*
                        
                        echo "Building production frontend bundle..."
                        npm run build
                    '''
                }
            }
        }
        stage('Deploy to Server') {
            steps {
                sh '''
                    echo "Deploying frontend build to production web root..."
                    HOST_IP="172.17.0.1"
                    DEPLOY_USER="itwekala-ttsmp"
                    WEB_ROOT="/home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html"
                    
                    # Ensure public_html exists
                    ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${HOST_IP} "mkdir -p ${WEB_ROOT}"
                    
                    # Deploy new build files directly to the web root
                    echo "Syncing build files to ${WEB_ROOT}..."
                    scp -o StrictHostKeyChecking=no -r frontend/dist/* ${DEPLOY_USER}@${HOST_IP}:${WEB_ROOT}/
                    
                    echo "Frontend successfully deployed to production web root!"
                '''
            }
        }
    }
}
